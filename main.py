# main.py
import os
import json
from fastapi import FastAPI, UploadFile, File, Form,BackgroundTasks, Header, HTTPException, Depends
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from dotenv import load_dotenv
import base64
from openai import OpenAI
from supabase import create_client, Client
import google.generativeai as genai
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uuid # 用于生成临时ID
from datetime import datetime
# 导入我们刚刚分离出来的魔法咒语和图纸
from ai_schemas import MASTER_SYSTEM_PROMPT, BRAIN_TOOLS, RELATION_LINKER_PROMPT, ROUTER_SKILL

# 加载 .env 文件中的配置
load_dotenv()

app = FastAPI()

# 🌟 修复点 1：配置 CORS，允许 Next.js 的本地 3000 端口访问
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 开发阶段允许所有
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 🌟 修复点 2：定义请求体，避免长文本放 URL 中
class IdeaRequest(BaseModel):
    text: str

# 🌟 增加一个用于接收更新数据的结构体
class UpdateIdeaReq(BaseModel):
    title: str
    summary: str
    content: str

# --- 1. 初始化各类大模型和数据库客户端 ---
kimi_client = OpenAI(
    api_key=os.getenv("KIMI_KEY"), 
    base_url="https://api.moonshot.cn/v1"
)
supabase: Client = create_client(
    os.getenv("SUPABASE_URL"), 
    os.getenv("SUPABASE_KEY")
)
genai.configure(api_key=os.getenv("GEMINI_KEY"), transport='rest')

# Supabase 的 JWT Secret (通常在 Supabase API 界面找到)
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET") # 👈 记得在 .env 里配好
ALGORITHM = "HS256"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

# 🌟 新增鉴权函数：从 Authorization Header 中提取 user_id
async def get_current_user_id(token: str = Depends(oauth2_scheme)):
    try:
        # 直接把 Token 丢给 Supabase 客户端，让官方接口去云端核验
        user_response = supabase.auth.get_user(token)
        
        if user_response and user_response.user:
            return user_response.user.id
        else:
            raise HTTPException(status_code=401, detail="无法验证凭证")
            
    except Exception as e:
        print(f"❌ Token 验证失败: {e}")
        raise HTTPException(status_code=401, detail="非法的或过期的 Token")

# --- 2. 辅助函数：获取免费向量 ---
def get_embedding(text):
    try:
        result = genai.embed_content(
            model="gemini-embedding-001",  # 🌟 修复点：使用最新版向量模型
            content=text,
            task_type="retrieval_query",
            output_dimensionality=768 
        )
        return result['embedding']
    except Exception as e:
        print(f"❌ Gemini 出错: {e}。启动备份方案：本地 Mock 向量...")
        # 备份方案：如果你实在被网络搞崩了，先返回一串随机数（768位），
        # 这样你可以先把存入和图谱逻辑跑通，不用在这儿卡死。
        return [0.0] * 768

async def auto_link_ideas(new_idea_id, new_content):
    # 1. 先找出最相似的 5 个旧笔记
    query_vector = get_embedding(new_content)
    old_notes = supabase.rpc("match_ideas", {
        "query_embedding": query_vector, "match_threshold": 0.3, "match_count": 5
    }).execute()
    
    if not old_notes.data: return
    
    # 2. 让 Kimi 来相亲（找关系）
    candidate_context = "\n".join([f"ID: {n['id']}, 内容: {n['content']}" for n in old_notes.data])
    
    check_res = kimi_client.chat.completions.create(
        model="moonshot-v1-8k",
        messages=[
            {"role": "system", "content": RELATION_LINKER_PROMPT},
            {"role": "user", "content": f"新灵感：{new_content}\n候选笔记库：\n{candidate_context}"}
        ],
        response_format={ "type": "json_object" }
    )
    
    links = json.loads(check_res.choices[0].message.content)
    
    # 3. 写入关系表
    for link in links.get("links", []):
        supabase.table("relations").insert({
            "source_id": new_idea_id,
            "target_id": link["target_id"],
            "relation_reason": link["reason"]
        }).execute()


# --- 3. 核心 API：智能文本灵感录入 ---

# 🌟 新增：更新已有灵感卡片的接口
@app.put("/update_idea/{idea_id}")
async def update_idea(idea_id: str, req: UpdateIdeaReq, user_id: str = Depends(get_current_user_id)):
    try:
        # 1. 获取数据库里原有的卡片结构数据
        old_data_res = supabase.table("ideas").select("structured_data").eq("id", idea_id).execute()
        if not old_data_res.data:
            return {"status": "error", "message": "找不到该卡片"}
            
        structured = old_data_res.data[0].get("structured_data", {})
        
        # 2. 更新标题和摘要
        structured["title"] = req.title
        structured["summary"] = req.summary
        
        # 3. 把新内容写回数据库 (暂时不重新生成向量，以快为主)
        supabase.table("ideas").update({
            "content": req.content,
            "structured_data": structured
        }).eq("id", idea_id).eq("user_id", user_id).execute()
        
        return {"status": "success"}
    except Exception as e:
        print(f"❌ 更新卡片失败: {e}")
        return {"status": "error", "message": str(e)}

# --- 🌟 新增：删除卡片接口 ---
@app.delete("/delete_idea/{idea_id}")
async def delete_idea(idea_id: str, user_id: str = Depends(get_current_user_id)):
    try:
        # 删除该灵感
        supabase.table("ideas").delete().eq("id", idea_id).eq("user_id", user_id).execute()
        # 级联删除相关的关系数据
        supabase.table("relations").delete().or_(f"source_id.eq.{idea_id},target_id.eq.{idea_id}").execute()
        return {"status": "success"}
    except Exception as e:
        print(f"❌ 删除卡片失败: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/smart_add_idea")
async def smart_add_idea(req: IdeaRequest, background_tasks: BackgroundTasks, user_id: str = Depends(get_current_user_id)):
    text = req.text
    print(f"🧠 接收到用户输入，正在以架构师身份检索相关记忆...")
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M")

    # ==========================================
    # 🌟 阶段 1：向量寻源 (Pre-RAG Check)
    # ==========================================
    new_vector = get_embedding(text)
    # 查找语义最接近的 1 条旧记录
    similar_res = supabase.rpc("match_ideas", {
        "query_embedding": new_vector, "match_threshold": 0.6, "match_count": 1
    }).execute()

    candidate_card = None
    if similar_res.data:
        candidate_card = similar_res.data[0]
        print(f"🔍 发现高潜相似卡片：{candidate_card['structured_data'].get('title')}")

    # ==========================================
    # 🌟 阶段 2：使用 Skill (Function Calling) 进行精准路由
    # ==========================================
    user_content = f"【本次新输入】：{text}\n"
    if candidate_card:
        user_content += f"\n【检测到高度相关的历史记录】：\n{candidate_card['structured_data'].get('summary', '')}\n请判断是否需要 Merge 追加。"
        
    chat_res = kimi_client.chat.completions.create(
        model="moonshot-v1-8k",
        messages=[
            {"role": "system", "content": MASTER_SYSTEM_PROMPT + strict_prompt},
            {"role": "user", "content": user_content}
        ],
        response_format={"type": "json_object"} # 强制 JSON 输出
    )

    decision = json.loads(chat_res.choices[0].message.content)
    action = decision.get("action", "create")
    
    # 提取 AI 的深度解析
    ai_analysis_text = decision.get("ai_analysis", "AI 暂无分析。")
    # 🌟 修复点 2：保留你要求的原话与 AI 分析的拼接逻辑
    # 如果是合并，我们直接采用 AI 缝合后的内容；如果是新建，则按你的格式拼接
    if action == "merge":
        final_content = decision.get("merged_content", text)
    else:
        final_content = f"💭 【我的原始灵感】\n{text}\n\n✨ 【AI 深度解析与优化】\n{ai_analysis_text}"

    # 构造标准化的结构化数据
    arguments = {
        "title": decision.get("title", "新灵感"),
        "summary": decision.get("summary", ""),
        "tech_stack": decision.get("tech_stack", []),
        "category": decision.get("category", "技术探索"),
        "ai_analysis": ai_analysis_text
    }

    # ==========================================
    # 🌟 阶段 3：执行数据库变更并对齐前端
    # ==========================================
    if action == "merge" and candidate_card:
        idea_id = candidate_card['id']
        print(f"✨ 架构师决策：执行融合策略 -> {idea_id}")
        supabase.table("ideas").update({
            "content": final_content,
            "structured_data": arguments,
            "embedding": get_embedding(final_content) # 更新向量
        }).eq("id", idea_id).execute()
    else:
        print("🌱 架构师决策：执行新建策略")
        insert_res = supabase.table("ideas").insert({
            "content": final_content,
            "structured_data": arguments, 
            "embedding": get_embedding(arguments['summary']),
            "user_id": user_id
        }).execute()
        idea_id = insert_res.data[0]['id'] if insert_res.data else str(uuid.uuid4())

    # 后台触发关系织网
    background_tasks.add_task(auto_link_ideas, idea_id, final_content)

    # 🌟 修复点 4：完全对齐前端 IdeaCard 接口结构
    return {
        "status": "success",
        "action": action, # 告诉前端是更新还是新建
        "id": idea_id,
        "category": arguments["category"].split("_")[-1],
        "title": arguments["title"],
        "summary": arguments["summary"],
        "content": final_content,
        "tech_stack": arguments["tech_stack"]
    }

# --- 4. 视觉 API：图片/截图灵感录入 ---
# --- 4. 视觉 API：图片/截图灵感录入 (使用 OpenAI 兼容模式调用 Gemini) ---
@app.post("/add_idea_from_image")
async def add_idea_from_image(file: UploadFile = File(...), user_note: str = Form("这是一张图")):
    try:
        # 1. 读取并转换图片
        img_data = await file.read()
        base64_image = base64.b64encode(img_data).decode('utf-8')
        
        # 2. 创建一个专门用于 Gemini 的 OpenAI 客户端
        # 注意：这里我们让它指向 Google 的官方兼容网关
        gemini_openai_client = OpenAI(
            api_key=os.getenv("GEMINI_KEY"),
            base_url="https://generativelanguage.googleapis.com/v1beta/openai/"
        )
        
        # 3. 发送请求 (使用最稳定的旧版 flash 模型名称)
        response = gemini_openai_client.chat.completions.create(
            model="gemini-2.5-flash", # 在这种兼容模式下，通常不需要加 models/ 前缀
            messages=[
                {
                    "role": "system",
                    "content": "你是一个知识提取专家。请分析图片并总结其中内容。"
                },
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": f"用户备注：{user_note}。请分析这张图片。"
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ]
        )
        
        return {"analysis": response.choices[0].message.content}
        
    except Exception as e:
        print(f"❌ Gemini 兼容模式报错: {e}")
        return {"analysis": f"图片识别请求失败: {str(e)}"}

# --- 5. 搜索 API：语义找回 ---
@app.get("/search")
async def search_ideas(query: str):
    query_vector = get_embedding(query)
    res = supabase.rpc("match_ideas", {
        "query_embedding": query_vector,
        "match_threshold": 0.5,
        "match_count": 5
    }).execute()
    return {"results": res.data}


@app.post("/brain_chat")
async def brain_chat(query: str, user_id: str = Depends(get_current_user_id)):
    # 1. 语义搜索：找出跟这个问题最相关的 3 条笔记
    # 先把用户的提问变成向量
    query_vector = get_embedding(query)
    
    # 从数据库找知识
    search_res = supabase.rpc("match_ideas", {
        "query_embedding": query_vector,
        "match_threshold": 0.4,
        "match_count": 3
    }).execute()
    
    # 2. 构造“记忆上下文”
    context_text = "\n".join([
        f"- {item['structured_data']['title']}: {item['content']}" 
        for item in search_res.data
    ])
    
    # 3. 带着记忆去问 Kimi
    rag_prompt = f"""
    你是我（主理人）的数字大脑镜像。以下是从我过去的笔记中检索到的相关记忆：
    {context_text}
    
    现在请根据这些记忆，结合我的当前提问：“{query}”，跟我进行深度探讨。
    如果记忆中没有相关内容，请基于你自己的知识回答，但要符合我平时的风格。
    """
    
    response = kimi_client.chat.completions.create(
        model="moonshot-v1-8k",
        messages=[{"role": "user", "content": rag_prompt}]
    )
    
    return {"answer": response.choices[0].message.content, "referenced_memories": search_res.data}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)