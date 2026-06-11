import os
import json
import numpy as np
from dotenv import load_dotenv
from supabase import create_client, Client
from openai import OpenAI
import google.generativeai as genai

# 1. 加载环境变量
load_dotenv()

# 2. 初始化各大客户端
supabase: Client = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_KEY"))
kimi_client = OpenAI(api_key=os.getenv("KIMI_KEY"), base_url="https://api.moonshot.cn/v1")
genai.configure(api_key=os.getenv("GEMINI_KEY"), transport='rest')

# 计算余弦相似度的函数
def cosine_similarity(v1, v2):
    return np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))

def get_embedding(text):
    result = genai.embed_content(
        model="gemini-embedding-001",
        content=text,
        task_type="retrieval_query",
        output_dimensionality=768
    )
    return result['embedding']

def run_data_governance():
    print("🔍 [Data Governance Agent] 开启全量数据巡逻...")
    
    # 获取数据库中所有的记录
    res = supabase.table("ideas").select("id, content, structured_data, embedding").execute()
    ideas = res.data

    if len(ideas) < 2:
        print("数据太少，无需清理。")
        return

    merged_ids = set() # 记录已经处理过的卡片，防重复

    # 双重循环，两两比对
    for i in range(len(ideas)):
        if ideas[i]['id'] in merged_ids: continue

        for j in range(i + 1, len(ideas)):
            if ideas[j]['id'] in merged_ids: continue

            raw_vec1 = ideas[i]['embedding']
            raw_vec2 = ideas[j]['embedding']

            # 防御机制：如果 Supabase 传回来的是字符串，必须先解析成真实的数字列表
            if isinstance(raw_vec1, str):
                raw_vec1 = json.loads(raw_vec1)
            if isinstance(raw_vec2, str):
                raw_vec2 = json.loads(raw_vec2)

            # 强制 Numpy 将其识别为浮点数 (float)，彻底解决 UFuncNoLoopError
            vec1 = np.array(raw_vec1, dtype=float)
            vec2 = np.array(raw_vec2, dtype=float)

            if vec1.size == 0 or vec2.size == 0: continue

            # 核心：计算相似度
            sim = cosine_similarity(vec1, vec2)

            # 如果相似度大于 0.90，判定为双胞胎卡片！
            if sim > 0.75:
                print(f"🚨 抓到双胞胎卡片!\n  A: {ideas[i]['structured_data'].get('title')}\n  B: {ideas[j]['structured_data'].get('title')}\n  (相似度: {sim:.4f})")
                print("🤖 正在呼叫 Kimi 执行灵魂融合...")

                # 让 Kimi 自动合并
                prompt = f"""
                你是一个数据清洗专家。我发现了两条高度重复的知识记录。
                请对比它们的差异，将所有独特的价值点提取出来，合并成一份完美的最终版内容。
                请严格输出JSON格式：
                {{
                    "title": "合并后的精确标题",
                    "summary": "合并后的专业摘要",
                    "tech_stack": ["技术1", "技术2"],
                    "merged_content": "完整连贯的合并正文"
                }}
                记录A：{ideas[i]['content']}
                记录B：{ideas[j]['content']}
                """
                
                chat_res = kimi_client.chat.completions.create(
                    model="moonshot-v1-8k",
                    messages=[{"role": "user", "content": prompt}],
                    response_format={"type": "json_object"}
                )
                merged_data = json.loads(chat_res.choices[0].message.content)

                print("✨ 融合完毕！正在覆写数据库...")

                # 重新计算合并后的向量
                new_vec = get_embedding(merged_data['merged_content'])

                # 保留原有的分类，更新其他结构化数据
                new_structured = ideas[i]['structured_data']
                new_structured['title'] = merged_data['title']
                new_structured['summary'] = merged_data['summary']
                new_structured['tech_stack'] = merged_data['tech_stack']

                # 执行覆写：更新 i 卡片
                supabase.table("ideas").update({
                    "content": merged_data['merged_content'],
                    "structured_data": new_structured,
                    "embedding": new_vec
                }).eq("id", ideas[i]['id']).execute()

                # 执行抹杀：删除 j 卡片
                supabase.table("ideas").delete().eq("id", ideas[j]['id']).execute()

                merged_ids.add(ideas[i]['id'])
                merged_ids.add(ideas[j]['id'])
                print(f"✅ 清理完成！\n---")
                break # 跳出内循环，继续检查下一个 i

    print("🎉 巡逻结束！系统数据已达到最完美状态。")

if __name__ == "__main__":
    run_data_governance()