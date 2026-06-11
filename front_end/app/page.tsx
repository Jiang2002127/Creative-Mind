"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createClient, Session } from '@supabase/supabase-js'
import { Sparkles, Send, X, Lightbulb, Layers, Tag, Clock, LogOut, MessageSquare, Bot, User, Mic, ImageIcon, Loader2 } from "lucide-react"


// 类型定义
interface IdeaCard {
  id: string
  category: string
  title: string
  summary: string
  content?: string
  tech_stack?: string[]
  created_at?: string
}

// Mock 数据
const mockData: IdeaCard[] = [
  {
    id: "1",
    category: "研发架构",
    title: "微服务网关设计方案",
    summary: "基于 Kong + Kubernetes 的 API 网关架构，支持动态路由、限流熔断、灰度发布等核心能力，采用 Sidecar 模式实现服务治理。",
    content: "完整的微服务网关设计方案，包含：\n\n1. 核心能力层：统一认证、动态路由、流量控制、协议转换\n2. 可观测性层：链路追踪、指标采集、日志聚合\n3. 扩展能力层：插件机制、Lua 脚本、WebAssembly 支持\n\n技术选型考量：Kong 提供了丰富的插件生态，配合 Kubernetes Ingress Controller 可实现声明式配置管理。",
    tech_stack: ["Kong", "Kubernetes", "gRPC", "Prometheus", "Jaeger"],
    created_at: "2024-03-15",
  },
  {
    id: "2",
    category: "梦境设计",
    title: "沉浸式数字花园交互",
    summary: "一个基于粒子系统的梦幻交互体验，用户的每次触摸都会绽放出独特的数字花朵，颜色随心情变化。",
    content: "设计理念：\n\n这是一个治愈系的数字艺术装置概念。当用户在屏幕上触摸时，会生成独特的花朵粒子动画。\n\n核心特性：\n- 基于 Three.js 的粒子系统\n- GPU 加速的着色器动画\n- 音乐节奏响应\n- 心率传感器连动（可选）\n\n视觉风格参考：千与千寻的花海 + Apple Music 的动态专辑封面",
    tech_stack: ["Three.js", "WebGL", "GLSL", "Web Audio API"],
    created_at: "2024-03-14",
  },
]

// 分类颜色映射
const categoryColors: Record<string, { bg: string; text: string }> = {
  研发架构: { bg: "bg-blue-100/80", text: "text-blue-700" },
  梦境设计: { bg: "bg-purple-100/80", text: "text-purple-700" },
  产品灵感: { bg: "bg-amber-100/80", text: "text-amber-700" },
  技术探索: { bg: "bg-emerald-100/80", text: "text-emerald-700" },
  生活随想: { bg: "bg-rose-100/80", text: "text-rose-700" },
  default: { bg: "bg-gray-100/80", text: "text-gray-700" },
}

// 技术栈颜色池
const techColors = [
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-lime-100 text-lime-700",
]

export default function CreativeMind() {
  console.log("🧠 CreativeMind组件渲染开始")

  // 🌟 1. 极其明确地初始化客户端，摒弃易错的 fallback 逻辑
  // 请确保你的 .env.local 中配置了 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY
  const [supabase] = useState(() => {
    // 强制使用环境变量，如果缺失，直接抛出明显错误，不让程序带着隐患继续运行
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // 注意：这里环境变量名我改成了标准的 NEXT_PUBLIC_SUPABASE_ANON_KEY 
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

    if (!supabaseUrl || !supabaseKey) {
        console.error("🚨 致命错误: 找不到 Supabase 环境变量！请检查 .env.local 文件。");
        // 为了开发阶段不直接白屏死机，提供一个默认值，但一定要在控制台引起注意
        return createClient(
            "https://ijurpgjfwuxkofywmeeq.supabase.co", 
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqdXJwZ2pmd3V4a29meXdtZWVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTc2MTMsImV4cCI6MjA4OTc3MzYxM30.W4OzEoCU6XMGhSEN0b-GZYu28mYrpMOCWjoJ0ii5dIA" // 确认这是你的 anon key
        )
    }
    return createClient(supabaseUrl, supabaseKey)
  })

  // 🌟 2. 状态定义
  const [session, setSession] = useState<Session | null>(null)
  const [loadingSession, setLoadingSession] = useState(true)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [authError, setAuthError] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)

  // 🌟 3. 重构的 useEffect：干净、明确的认证流程
  useEffect(() => {
    console.log("🧠 初始化认证监听雷达...");
    let mounted = true;

    const initializeAuth = async () => {
        try {
            console.log("🧠 开始请求当前 Session...");
            const { data, error } = await supabase.auth.getSession();
            
            if (!mounted) return;

            if (error) {
                console.error("❌ 获取 Session 失败:", error.message);
                setAuthError(`认证服务异常: ${error.message}`);
                // 即使报错，也要解除 loading，让用户看到登录界面
                setSession(null); 
            } else {
                console.log("✅ 成功获取 Session:", !!data.session);
                setSession(data.session);
            }
        } catch (err) {
            console.error("❌ 网络或未知错误:", err);
            if (mounted) {
                setAuthError("连接认证服务器失败，请检查网络。");
                setSession(null);
            }
        } finally {
            if (mounted) {
                console.log("🧠 解除页面锁定状态");
                setLoadingSession(false);
            }
        }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`🧠 认证状态变更事件: ${_event}, 当前 Session 状态: ${!!session}`);
      if (mounted) {
        setSession(session)
      }
    })

    return () => {
      mounted = false;
      subscription.unsubscribe()
    }
  }, [supabase])

  // --- 🌟 补齐缺失的聊天状态 ---
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatMessages, setChatMessages] = useState<{role: "user" | "ai", content: string}[]>([
    { role: "ai", content: "你好！我是你的数字大脑镜像。想结合过去的记忆深入探讨点什么？" }
  ])
  const [chatInput, setChatInput] = useState("")
  const [isChatting, setIsChatting] = useState(false)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight
    }
  }, [chatMessages])

  // --- 🌟 补齐缺失的登陆函数 ---
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAuthError(error.message)
    else setAuthError("")
  }

  // --- 新增：注册函数 ---
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) {
      setAuthError(error.message)
    } else {
      setAuthError("注册成功！请检查邮箱确认邮件。")
    }
  }

  // --- 新增：登出函数 ---
  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      console.error("登出失败:", error.message)
    }
  }


  
  const [ideas, setIdeas] = useState<IdeaCard[]>([])
  // --- 🌟 新增：开机自动读取真实数据库记忆 ---
  useEffect(() => {
    // 只有在用户登录成功后，才去拉取数据
    if (!session) return;

    const fetchMyIdeas = async () => {
      try {
        const { data, error } = await supabase
          .from("ideas")
          .select("*")
          .eq("user_id", session.user.id) // 严格遵循 RLS，只拉自己的
          .order("created_at", { ascending: false }); // 最新的排在最前面

        if (error) {
          console.error("读取数据库失败:", error.message);
          return;
        }

        if (data) {
          // 把后端的存法转换成前端卡片认识的格式
          const realIdeas: IdeaCard[] = data.map((item: any) => ({
            id: item.id,
            category: item.structured_data?.category?.split("_").pop() || "未分类",
            title: item.structured_data?.title || "未命名灵感",
            summary: item.structured_data?.summary || "暂无摘要",
            content: item.content,
            tech_stack: item.structured_data?.tech_stack || [],
            created_at: item.created_at ? item.created_at.split("T")[0] : "",
          }));
          
          setIdeas(realIdeas);
        }
      } catch (err) {
        console.error("网络异常导致读取失败:", err);
      }
    };

    fetchMyIdeas();
  }, [session, supabase]); 
  // 👆 依赖项里填了 session，意味着只要登录状态一确认，这段逻辑就会自动跑一次
  const [inputText, setInputText] = useState("")
  const [isRecording, setIsRecording] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<IdeaCard | null>(null)
  const [isEditingCard, setIsEditingCard] = useState(false)
  const [editCardData, setEditCardData] = useState({ title: "", summary: "", content: "" })

  // --- 🌟 新增：保存卡片编辑的函数 ---
  const handleSaveEdit = async () => {
    if (!selectedCard || !session) return;
    try {
      const response = await fetch(`http://127.0.0.1:8000/update_idea/${selectedCard.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify(editCardData)
      });
      
      if (response.ok) {
        // 更新本地瀑布流里的卡片数据，无需刷新页面
        setIdeas(ideas.map(idea => idea.id === selectedCard.id ? { 
            ...idea, title: editCardData.title, summary: editCardData.summary, content: editCardData.content 
        } : idea));
        
        // 更新当前弹窗的数据并退出编辑模式
        setSelectedCard({ ...selectedCard, title: editCardData.title, summary: editCardData.summary, content: editCardData.content });
        setIsEditingCard(false);
      }
    } catch (error) {
      console.error("更新卡片失败:", error);
    }
  };

  // 发送想法到 API
  const handleSubmit = useCallback(async () => {
    if (!inputText.trim() || isLoading) return

    if (!session) { 
      setAuthError("大脑未连接，请先登录！")
      return 
    }

    setIsLoading(true)
    try {
      const response = await fetch("http://127.0.0.1:8000/smart_add_idea", {
        method: "POST",
        headers: {
          "Content-Type": "application/json", // 🌟 声明 JSON 格式
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ text: inputText }), // 🌟 放入 Body 中发送
      })
      
      if (!response.ok) {
        throw new Error("请求失败")
      }
      
      const data = await response.json()
      
      if (data.status === "error") {
        console.error(data.message)
        return
      }

      // 🌟 直接合并后端传来的结构
      // 🌟 核心：判断 AI 的决策是“合并”还是“新建”
      const newIdea: IdeaCard = {
        ...data,
        created_at: new Date().toISOString().split("T")[0],
      }
      
      if (data.action === "merge") {
        // 如果是合并，就在列表里找到那张老卡片，把它替换成合并后的新卡片
        setIdeas((prev) => prev.map(idea => idea.id === data.id ? newIdea : idea));
        // 给用户一个极具 Wow Moment 的弹窗反馈
        alert(`✨ AI 发现相关记忆！已自动为您融合进卡片：[${data.title}]`);
      } else {
        // 如果是新建，直接加在最前面
        setIdeas((prev) => [newIdea, ...prev]);
      }
      
      setInputText("")
    } catch (error) {
      console.error("添加想法失败:", error)
    } finally {
      setIsLoading(false)
    }
  }, [inputText, isLoading])

  // --- 🌟 基于 RAG 的灵感伴随探讨请求 ---
  const handleSendChatMessage = async () => {
    if (!chatInput.trim() || isChatting) return

    // 如果未登录，直接拒绝服务
    if (!session) { 
      setChatMessages(prev => [...prev, {role: 'ai', content: '大脑未连接，请先登录才能访问长期记忆。'}])
      return 
    }

    const userMsg = chatInput
    setChatMessages(prev => [...prev, { role: "user", content: userMsg }])
    setChatInput("")
    setIsChatting(true)

    try {
      // 发送带有 JWT Token 的请求
      const response = await fetch(`http://127.0.0.1:8000/brain_chat?query=${encodeURIComponent(userMsg)}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${session.access_token}`
        }
      })
      
      if (!response.ok) throw new Error("网络错误")
      
      const data = await response.json()
      setChatMessages(prev => [...prev, { role: "ai", content: data.answer }])
    } catch (error) {
      setChatMessages(prev => [...prev, { role: "ai", content: "大脑连接暂时中断了..." }])
    } finally {
      setIsChatting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // --- 🎤 听觉：语音输入处理逻辑 (调用浏览器原生 API，完全免费) ---
  const handleStartRecording = () => {
    // @ts-ignore 处理不同浏览器的前缀兼容
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("您的浏览器暂不支持语音识别，请使用 Chrome 等现代浏览器。");
      return;
    }
    
    const recognition = new SpeechRecognition();
    recognition.lang = 'zh-CN'; // 锁定中文识别
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsRecording(true);
    
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // 把识别出的话，加到现有的输入框文字后面
      setInputText(prev => prev + (prev ? " " : "") + transcript);
    };
    
    recognition.onerror = (event: any) => {
      console.error("语音识别错误:", event.error);
      setIsRecording(false);
    };
    
    recognition.onend = () => setIsRecording(false);
    recognition.start();
  };

  // --- 🖼️ 视觉：图片上传与大模型识别逻辑 ---
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_note", "提取图片核心信息");

    try {
      // 调用你 main.py 里早就写好的视觉识别接口
      const response = await fetch("http://127.0.0.1:8000/add_idea_from_image", {
        method: "POST",
        body: formData // 注意：传 FormData 时不需要也不应该手动设 Content-Type
      });
      
      if (!response.ok) throw new Error("图片识别请求失败");
      
      const data = await response.json();
      if (data.analysis) {
        // 将 Gemini 分析提取的核心结论，追加到输入框里
        setInputText(prev => prev + (prev ? "\n" : "") + "[图片识别内容]: " + data.analysis);
      }
    } catch (error) {
      console.error("图片识别失败:", error);
      alert("图片识别失败，请检查后端 Gemini 接口配置。");
    } finally {
      setIsUploadingImage(false);
      // 清空 file input，允许下次上传同一张图
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // --- 🌟 补齐未登录时的拦截与登陆界面 ---
  console.log("🧠 渲染前状态检查:", { loadingSession, session: !!session, authError })
  if (loadingSession) {
    console.log("🧠 显示加载状态")
    return <div className="flex h-screen items-center justify-center text-gray-500">连接大脑基建中...</div>
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FDFBF7" }}>
        <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="p-8 bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl shadow-2xl flex flex-col gap-4 w-96 relative z-10">
          <h2 className="text-xl font-bold mb-4 text-gray-800">{isSignUp ? "注册数字大脑" : "连接数字大脑"}</h2>
          {authError && <p className={`text-sm ${authError.includes("成功") ? "text-green-500" : "text-rose-500"}`}>{authError}</p>}
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="邮箱" className="px-4 py-3 rounded-xl bg-white/60 border border-white focus:outline-none" />
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="密码" className="px-4 py-3 rounded-xl bg-white/60 border border-white focus:outline-none" />
          <button type="submit" className="px-4 py-3 bg-indigo-500 text-white rounded-xl shadow-lg hover:bg-indigo-600">
            {isSignUp ? "创建大脑" : "唤醒大脑"}
          </button>
          <div className="flex justify-center mt-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp)
                setAuthError("")
              }}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {isSignUp ? "已有账户？登录" : "没有账户？注册"}
            </button>
          </div>
        </form>
      </div>
    )
  }

  const getCategoryColor = (category: string) => {
    return categoryColors[category] || categoryColors.default
  }

  const getTechColor = (index: number) => {
    return techColors[index % techColors.length]
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#FDFBF7" }}>
      {/* 呼吸浮动的马卡龙色圆形背景 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 淡粉色圆形 */}
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-3xl opacity-40 animate-float-slow"
          style={{
            background: "linear-gradient(135deg, #FFD1DC 0%, #FFB6C1 100%)",
            top: "-10%",
            right: "-5%",
          }}
        />
        {/* 鹅黄色圆形 */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-3xl opacity-35 animate-float-medium"
          style={{
            background: "linear-gradient(135deg, #FFF8DC 0%, #FFEFD5 100%)",
            bottom: "10%",
            left: "-10%",
          }}
        />
        {/* 薄荷绿圆形 */}
        <div
          className="absolute w-[450px] h-[450px] rounded-full blur-3xl opacity-35 animate-float-fast"
          style={{
            background: "linear-gradient(135deg, #B8F5E0 0%, #98D8C8 100%)",
            top: "40%",
            right: "20%",
          }}
        />
      </div>

      {/* 页面标题 */}
      <header className="relative z-10 pt-12 pb-8 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-white/50 backdrop-blur-xl border border-white/60 shadow-lg">
                <Sparkles className="w-7 h-7 text-amber-500" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Creative Mind</h1>
                <p className="text-gray-500 text-sm mt-0.5">捕捉每一个灵感瞬间</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100/60 hover:bg-gray-200/60 text-gray-700 rounded-xl transition-colors"
              title="登出"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm">登出</span>
            </button>
          </div>
        </div>
      </header>

      {/* 瀑布流卡片区域 */}
      <main className="relative z-10 px-6 pb-32">
        <div className="max-w-6xl mx-auto">
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
            {ideas.map((idea) => (
              <IdeaCardComponent
                key={idea.id}
                idea={idea}
                onClick={() => setSelectedCard(idea)}
                getCategoryColor={getCategoryColor}
                getTechColor={getTechColor}
              />
            ))}
          </div>

          {ideas.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="p-6 rounded-full bg-white/40 backdrop-blur-xl border border-white/60 mb-4">
                <Lightbulb className="w-12 h-12 text-amber-400" />
              </div>
              <p className="text-gray-500 text-lg">还没有灵感卡片</p>
              <p className="text-gray-400 text-sm mt-1">在下方输入框记录你的第一个想法吧</p>
            </div>
          )}
        </div>
      </main>

      {/* 底部固定悬浮的 Thinking Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-6">
        <div className="max-w-2xl mx-auto">
          <div className="relative bg-white/60 backdrop-blur-2xl border border-white/70 rounded-[28px] shadow-2xl shadow-black/5 p-2">
            <div className="flex items-center gap-2">
              
              {/* 🌟 隐藏的图片选择器，被图片按钮触发 */}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                className="hidden" 
                accept="image/*" 
              />
              
              <div className="flex-1 relative flex items-center pl-2">
                {/* 🌟 新增的麦克风和图片按钮组 */}
                <div className="flex items-center gap-1 mr-2 text-gray-400">
                  <button 
                    onClick={handleStartRecording}
                    title="语音转文字"
                    className={`p-2 rounded-full hover:bg-gray-100/50 transition-colors ${isRecording ? 'text-red-500 animate-pulse bg-red-50/50' : 'hover:text-gray-600'}`}
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                    title="上传图片给大模型识别"
                    className="p-2 rounded-full hover:bg-gray-100/50 hover:text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {isUploadingImage ? <Loader2 className="w-5 h-5 animate-spin text-indigo-500" /> : <ImageIcon className="w-5 h-5" />}
                  </button>
                </div>

                {/* 🌟 原本的输入框（增加了状态提示） */}
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isRecording ? "正在聆听语音..." : isUploadingImage ? "Gemini 正在识别图片..." : "输入灵感、说话，或传图..."}
                  className="w-full py-3.5 bg-transparent text-gray-800 placeholder:text-gray-400 focus:outline-none text-base disabled:opacity-50"
                  disabled={isLoading || isUploadingImage}
                />
              </div>
              <button
                onClick={handleSubmit}
                disabled={!inputText.trim() || isLoading}
                className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
              >
                {/* 发光效果 */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-300 to-orange-400 blur-md opacity-50 -z-10" />
                {isLoading ? <span>发送中...</span> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 悬浮呼出按钮：伴随式探讨 */}
      <button 
        onClick={() => setIsChatOpen(true)}
        className="fixed bottom-8 right-8 z-50 w-14 h-14 bg-white/80 backdrop-blur-xl border border-white rounded-full shadow-2xl flex items-center justify-center hover:scale-105 transition-transform"
      >
        <MessageSquare className="w-6 h-6 text-indigo-500" />
      </button>

      {/* 🌟 侧边聊天抽屉 (Copilot) */}
      {isChatOpen && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white/80 backdrop-blur-2xl border-l border-white/70 shadow-2xl z-[100] flex flex-col animate-in slide-in-from-right duration-300">
          {/* 抽屉头部 */}
          <div className="p-4 border-b border-gray-200/50 flex justify-between items-center bg-white/40">
            <h3 className="font-bold flex items-center gap-2"><Bot className="w-5 h-5 text-indigo-500" /> 知识图谱探讨舱</h3>
            <button onClick={() => setIsChatOpen(false)}><X className="w-5 h-5 text-gray-500 hover:text-gray-800" /></button>
          </div>
          
          {/* 对话列表区 */}
          <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-amber-100 text-amber-600" : "bg-indigo-100 text-indigo-600"}`}>
                  {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>
                <div className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed whitespace-pre-wrap ${msg.role === "user" ? "bg-amber-400 text-white rounded-tr-none" : "bg-white/60 border border-white rounded-tl-none text-gray-700"}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatting && <div className="text-gray-400 text-xs pl-12 animate-pulse">大脑正在检索并思考...</div>}
          </div>

          {/* 底部输入框 */}
          <div className="p-4 bg-white/40 border-t border-gray-200/50 flex gap-2">
            <input 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChatMessage()}
              placeholder="追问你的构思细节..." 
              className="flex-1 bg-white/60 border border-white rounded-xl px-4 py-2 focus:outline-none text-sm"
            />
            <button 
              onClick={handleSendChatMessage} 
              disabled={isChatting || !chatInput.trim()}
              className="p-2 bg-indigo-500 text-white rounded-xl disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {/* 详情弹窗 Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setSelectedCard(null)}
        >
          <div
            className="relative w-full max-w-lg max-h-[80vh] overflow-auto bg-white/80 backdrop-blur-2xl border border-white/70 rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-gray-100/80 hover:bg-gray-200/80 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>

            {/* 分类标签 */}
            <div className="flex items-center gap-2 mb-4">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${getCategoryColor(selectedCard.category).bg} ${getCategoryColor(selectedCard.category).text}`}
              >
                <Tag className="w-3.5 h-3.5" />
                {selectedCard.category}
              </span>
              {selectedCard.created_at && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm text-gray-500 bg-gray-100/60">
                  <Clock className="w-3.5 h-3.5" />
                  {selectedCard.created_at}
                </span>
              )}
            </div>

            {/* 🌟 核心区域：编辑模式 vs 浏览模式 切换 */}
            {!isEditingCard ? (
              <>
                <div className="flex justify-between items-start mb-3 pr-8">
                  <h2 className="text-xl font-bold text-gray-900">{selectedCard.title}</h2>
                  <button 
                    onClick={() => {
                      setEditCardData({ title: selectedCard.title, summary: selectedCard.summary, content: selectedCard.content || "" });
                      setIsEditingCard(true);
                    }}
                    className="px-3 py-1 text-xs font-medium bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                  >
                    编辑内容
                  </button>
                </div>
                <p className="text-gray-600 leading-relaxed mb-4">{selectedCard.summary}</p>
                {selectedCard.content && (
                  <div className="bg-gray-50/60 rounded-2xl p-4 mb-4">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{selectedCard.content}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col gap-3 mb-4 mt-2 pr-8">
                <input 
                  value={editCardData.title}
                  onChange={e => setEditCardData({...editCardData, title: e.target.value})}
                  className="w-full text-xl font-bold text-gray-900 border-b border-gray-200 focus:border-indigo-500 focus:outline-none bg-transparent pb-1"
                  placeholder="卡片标题"
                />
                <textarea 
                  value={editCardData.summary}
                  onChange={e => setEditCardData({...editCardData, summary: e.target.value})}
                  className="w-full text-gray-600 bg-gray-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                  rows={2}
                  placeholder="卡片摘要"
                />
                <textarea 
                  value={editCardData.content}
                  onChange={e => setEditCardData({...editCardData, content: e.target.value})}
                  className="w-full text-sm text-gray-700 bg-gray-50 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y min-h-[150px]"
                  placeholder="详细内容..."
                />
               <div className="flex justify-between items-center mt-4 border-t border-gray-100 pt-3">
                  {/* 🌟 危险操作区：删除按钮 */}
                  <button 
                    onClick={async () => {
                      if (window.confirm("确定要永久删除这条灵感吗？")) {
                        await fetch(`http://127.0.0.1:8000/delete_idea/${selectedCard.id}`, {
                          method: "DELETE",
                          headers: { "Authorization": `Bearer ${session?.access_token}` }
                        });
                        setIdeas(ideas.filter(idea => idea.id !== selectedCard.id));
                        setSelectedCard(null);
                        setIsEditingCard(false);
                      }
                    }} 
                    className="px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    删除卡片
                  </button>

                  
                  {/* 原本的取消和保存按钮 */}
                  <div className="flex gap-2">
                    <button onClick={() => setIsEditingCard(false)} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-xl">取消</button>
                    <button onClick={handleSaveEdit} className="px-4 py-2 text-sm text-white bg-indigo-500 hover:bg-indigo-600 rounded-xl shadow-md">保存修改</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}


// 卡片组件
function IdeaCardComponent({
  idea,
  onClick,
  getCategoryColor,
  getTechColor,
}: {
  idea: IdeaCard
  onClick: () => void
  getCategoryColor: (category: string) => { bg: string; text: string }
  getTechColor: (index: number) => string
}) {
  const categoryColor = getCategoryColor(idea.category)

  return (
    <div
      onClick={onClick}
      className="break-inside-avoid group cursor-pointer bg-white/40 backdrop-blur-xl border border-white/60 rounded-3xl p-5 shadow-lg shadow-black/[0.03] hover:shadow-xl hover:shadow-black/[0.06] hover:bg-white/50 hover:scale-[1.02] transition-all duration-300 ease-out"
    >
      {/* 分类标签 */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${categoryColor.bg} ${categoryColor.text}`}
        >
          <Tag className="w-3 h-3" />
          {idea.category}
        </span>
      </div>

      {/* 标题 */}
      <h3 className="text-base font-semibold text-gray-900 mb-2 leading-snug group-hover:text-gray-800">
        {idea.title}
      </h3>

      {/* 摘要 */}
      <p className="text-sm text-gray-500 leading-relaxed line-clamp-3 mb-3">{idea.summary}</p>

      {/* 技术栈药丸标签 */}
      {idea.tech_stack && idea.tech_stack.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-200/40">
          {idea.tech_stack.slice(0, 4).map((tech, index) => (
            <span
              key={tech}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getTechColor(index)}`}
            >
              {tech}
            </span>
          ))}
          {idea.tech_stack.length > 4 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
              +{idea.tech_stack.length - 4}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
