# 🧠 Creative Mind —— 基于 Agent 路由的多模态第二大脑

不是“AI 赋能”，而是真正的“AI 原生”。

彻底摒弃传统笔记工具依赖人工分类的落后交互，从 0 到 1 架构的一款具备“自生长”能力的 AI-Native 知识智能体。

---

# 💡 设计哲学 (Philosophy)

市面上大多数知识库（如 Notion AI）采用的是 “UI 驱动的 CRUD + AI 插件” 模式，如果拔掉 AI，它们依然是传统的文件夹笔记。

而在 Creative Mind 中，AI 是整个系统的地基。系统没有“新建/保存”按钮，也没有“文件夹分类”。用户只需极其低摩擦地倾倒碎片化信息，背后的 LLM Router（决策智能体）会接管一切，自主决定知识的“开辟 (Create)”或“无缝融合 (Merge)”。

---

# ✨ 核心特性 (Core Features)

## 🚦 Pre-RAG 智能路由与动态聚合

摒弃脆弱的自然语言 Prompt，将大模型判定封装为系统级 Function Calling (Skill)。

在非结构化数据入库前，执行 Supabase 向量寻回与大模型语义比对，自动完成知识的合并与发散。

---

## ⏳ 时间序列化记忆 (Timeline)

解决大模型“自作聪明”覆写原意的问题。

采用追加式（Append-only）的 History Logs 数据结构，保留每一次灵感补充的时间戳、原始输入与 AI 深度洞察，形成可溯源的对话树。

---

## 👁️ 多模态极速捕获流

### 听觉

集成 Web Speech API，实现极低成本、无感知的语音轻量级转写。

### 视觉

接入 Gemini 视觉大模型兼容网关，一键解析架构图纸、手稿，自动提取核心实体并存入记忆图谱。

---

## 💬 伴随式图谱探讨舱 (Brain Chat)

落地高可用 RAG 链路，通过语义搜索唤醒相关的个人历史卡片。

调度 32k 长上下文大模型（Moonshot-v1-32k）作为系统“咨询师”，基于个人专属记忆进行深度的逻辑推演与头脑风暴。

---

# 🛠️ 技术架构 (Tech Stack)

## 前端 (Frontend)

* Next.js
* React
* TailwindCSS
* Lucide Icons

## 后端 (Backend)

* FastAPI (Python)
* Background Tasks（异步任务队列）

## 数据库 (Database)

* Supabase

  * PostgreSQL
  * pgvector 向量检索
  * Auth 鉴权
  * Storage 图床

## 大模型路由网关 (Model Gateway)

### 逻辑控制层

* Moonshot-v1-8k
* Gemini 1.5 Flash

用于 JSON 强结构化输出与路由。

### 深度推理层

* Moonshot-v1-32k

用于长文本合并与 RAG 伴随探讨。

### 视觉感知层

* Gemini 2.5 Flash

用于多模态图像识别。

---

# 🚀 快速开始 (Getting Started)

## 1. 环境准备

确保你的本地已安装 Node.js (v18+) 和 Python 3.9+。

---

## 2. 克隆项目

```bash
git clone https://github.com/Jiang2002127/Creative-Mind.git

cd Creative-Mind
```

---

## 3. 配置环境变量

本项目严格实施秘钥隔离，请勿将真实 API Key 提交到版本库。

### 后端环境变量

在根目录复制模板文件并填入真实秘钥：

```bash
cp .env.example .env
```

修改 `.env` 文件：

```env
KIMI_KEY=your_kimi_api_key_here
GEMINI_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_service_role_key_here
```

### 前端环境变量

进入 `front_end` 目录：

```bash
cd front_end

cp .env.example .env.local
```

修改 `.env.local` 文件：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

---

## 4. 启动服务

### 启动后端 (FastAPI)

```bash
# 在项目根目录下

python -m venv venv

source venv/bin/activate
# Windows: venv\Scripts\activate

pip install -r requirements.txt

python main.py
```

后端服务将运行在：

```text
http://127.0.0.1:8000
```

---

### 启动前端 (Next.js)

```bash
# 在 front_end 目录下

npm install

npm run dev
```

前端服务将运行在：

```text
http://localhost:3000
```
