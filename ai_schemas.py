# ai_schemas.py

# 1. 大脑的系统级指令
MASTER_SYSTEM_PROMPT = """
你是一个全能的“第二大脑”数据解构特工。你的主理人可能是开发者、设计师或作家。
请仔细阅读主人的随意输入（可能是错字连篇的语音转写，也可能是高度专业的内容）。
你的唯一任务是：
1. 识别这属于哪种身份的思考（研发 / 设计 / 创作）。
2. 过滤掉无意义的口语废话（如“今天早上没睡好想到了一个...”）。
3. 必须，且只能通过调用对应的 function 来输出结构化数据！不要回复任何普通的聊天文本。
"""

RELATION_LINKER_PROMPT = """
你是一个直觉极其敏锐的联想专家。现在有一条新存入的灵感卡片A，以及一批旧的灵感卡片B列表。
请判断：A 是否与 B 中的某些条目存在跨学科、跨领域的“奇妙联系”？
例如：一个心理学理论可以解决一个程序Bug，或者一个梦境可以启发一个UI设计。
输出 JSON：[{"target_id": "...", "reason": "为什么联系"}]，没有则输出 []。
"""

# 2. 三大身份的 Function Calling 工具箱

BRAIN_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "save_developer_note",
            "description": "当用户输入代码片段、系统架构、技术心得、或报错信息时调用此函数",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "技术点或Bug的简短标题"},
                    "summary": {"type": "string", "description": "一句话核心技术摘要"},
                    "tech_stack": {"type": "array", "items": {"type": "string"}, "description": "涉及的编程语言或框架"},
                    "ai_analysis": {"type": "string", "description": "对用户想法的初步可行性分析、架构漏洞排查以及优化扩展建议（可分段落）"}, 
                    "category": {"type": "string", "enum": ["研发_代码片段", "研发_架构思考", "研发_Bug记录", "研发_论文文献"]}
                },
                "required": ["title", "summary", "tech_stack", "ai_analysis", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_designer_note",
            "description": "当用户输入UI/UX设计灵感、配色、情绪板描述时调用此函数",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "设计理念标题"},
                    "summary": {"type": "string", "description": "核心视觉传达意图摘要"},
                    "visual_tags": {"type": "array", "items": {"type": "string"}, "description": "视觉标签，如'极简','毛玻璃'等"},
                    "ai_analysis": {"type": "string", "description": "对设计构思的可行性分析、用户体验(UX)优化建议以及视觉延展想法"}, 
                    "category": {"type": "string", "enum": ["设计_UI界面", "设计_情绪板", "设计_交互动画"]}
                },
                "required": ["title", "summary", "visual_tags", "ai_analysis", "category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "save_writer_note",
            "description": "当用户输入故事大纲、梦境、小说人物设定时调用此函数",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "故事或设定的标题"},
                    "summary": {"type": "string", "description": "一句话剧情梗概或思想核心"},
                    "emotional_arc": {"type": "string", "description": "这段文字蕴含的情绪走向"},
                    "ai_analysis": {"type": "string", "description": "对故事设定的逻辑漏洞排查、灵感视角的深度延展以及写作方向建议"}, 
                    "category": {"type": "string", "enum": ["创作_梦境", "创作_大纲设定", "创作_人物小传", "创作_文学随笔"]}
                },
                "required": ["title", "summary", "emotional_arc", "ai_analysis", "category"]
            }
        }
    },
    # 👇 🌟 新增的第四个工具：心情随笔树洞
    {
        "type": "function",
        "function": {
            "name": "save_journal_note",
            "description": "当用户输入日常心情、生活吐槽、情绪倾诉或没有明确专业属性的随笔碎碎念时调用此函数",
            "parameters": {
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "日记或随笔的温柔小标题"},
                    "summary": {"type": "string", "description": "一句话概括今天的心情或发生的事情"},
                    "tech_stack": {"type": "array", "items": {"type": "string"}, "description": "提取当前文字中的情绪状态标签（如：焦虑、开心、小确幸、疲惫等）"}, # 这里借用 tech_stack 字段传给前端，前端直接渲染出情绪标签
                    "ai_analysis": {"type": "string", "description": "【关键指令】绝对不要做冰冷的逻辑分析！请以一个极其温柔、高情商的倾听者身份，给出共情、安慰、或者情绪疏导的回应。"}, 
                    "category": {"type": "string", "enum": ["生活_心情日记", "生活_碎碎念", "生活_情绪倾诉"]}
                },
                "required": ["title", "summary", "tech_stack", "ai_analysis", "category"]
            }
        }
    }
]

# 👇 🌟 新增的系统级 Skill：智能路由决策器
ROUTER_SKILL = {
    "type": "function",
    "function": {
        "name": "execute_smart_routing",
        "description": "判断用户的新输入是应该作为新记录创建，还是作为历史记录的追加时间线合并。",
        "parameters": {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string", 
                    "enum": ["create", "merge"],
                    "description": "如果是对旧卡片的细节补充、延续，执行merge；若是全新话题执行create"
                },
                "title": {"type": "string", "description": "10字以内的项目宏观概括标题"},
                "summary": {"type": "string", "description": "整体项目的宏观摘要。如果是 merge，请结合新灵感更新此摘要。"},
                "tech_stack": {"type": "array", "items": {"type": "string"}, "description": "提取硬核技术名词"},
                "category": {"type": "string", "description": "分类（如 研发架构, 产品灵感）"},
                "ai_insight": {
                    "type": "string", 
                    "description": "【核心指令】仅针对本次用户的【新灵感】给出的专家点评、可行性分析。绝对不要把旧卡片的内容混在一起重写！"
                }
            },
            "required": ["action", "title", "summary", "tech_stack", "category", "ai_insight"]
        }
    }
}