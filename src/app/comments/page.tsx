"use client"
import { useState, useEffect } from "react"
import {
  Sparkles,
  Loader2,
  MessageSquare,
  Heart,
  AlertCircle,
  Copy,
  Check,
  Clock,
  RotateCcw,
  Quote,
} from "lucide-react"
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { generateCommentsResult } from "@/lib/ai-handlers"

type Sentiment = {
  positive: number
  neutral: number
  negative: number
  summary: string
}
type PainPoint = {
  point: string
  severity: "高" | "中" | "低"
  evidence: string
}
type Reply = {
  tone: "温暖" | "专业" | "幽默"
  target: string
  content: string
}
type CommentsResult = {
  sentiment: Sentiment
  painPoints: PainPoint[]
  replies: Reply[]
}

type HistoryItem = {
  id: string
  commentsPreview: string
  sentimentSummary: string
  timestamp: number
}

// 严重程度标签样式映射
const SEVERITY_STYLE: Record<PainPoint["severity"], string> = {
  高: "bg-rose-100 text-rose-700",
  中: "bg-amber-100 text-amber-700",
  低: "bg-slate-100 text-slate-600",
}

// 回复基调标签样式映射
const TONE_STYLE: Record<Reply["tone"], string> = {
  温暖: "bg-rose-100 text-rose-700",
  专业: "bg-emerald-100 text-emerald-700",
  幽默: "bg-amber-100 text-amber-700",
}

export default function CommentsPage() {
  const [comments, setComments] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<CommentsResult | null>(null)
  const [copied, setCopied] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("comments-history")
      if (raw) setHistory(JSON.parse(raw))
    } catch {
      /* 忽略 */
    }
  }, [])

  async function analyze() {
    if (!comments.trim() || loading) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const data = await generateCommentsResult({ comments })
      setResult(data)
      const item: HistoryItem = {
        id: Date.now().toString(),
        commentsPreview: comments.slice(0, 40),
        sentimentSummary: data.sentiment.summary,
        timestamp: Date.now(),
      }
      const next = [item, ...history].slice(0, 10)
      setHistory(next)
      localStorage.setItem("comments-history", JSON.stringify(next))
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "分析失败，请检查 .env.local 中的 NEXT_PUBLIC_LLM_API_KEY 配置",
      )
    } finally {
      setLoading(false)
    }
  }

  async function copy(text: string, id: string) {
    if (!text) return
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(""), 1500)
    } catch {
      /* 忽略 */
    }
  }

  function restore(h: HistoryItem) {
    setComments(h.commentsPreview)
    setError("")
  }

  // 情感分布饼图数据
  const pieData = result
    ? [
        { name: "正面", value: result.sentiment.positive, color: "#10b981" },
        { name: "中性", value: result.sentiment.neutral, color: "#94a3b8" },
        { name: "负面", value: result.sentiment.negative, color: "#f43f5e" },
      ]
    : []
  const allZero =
    result &&
    result.sentiment.positive === 0 &&
    result.sentiment.neutral === 0 &&
    result.sentiment.negative === 0

  return (
    <div className="p-5 sm:p-8">
      <header className="mb-6">
        <h1 className="text-gradient text-2xl font-bold">评论互动复盘助手</h1>
        <p className="mt-1 text-sm text-slate-500">
          粘贴粉丝评论，AI 自动做情感分析、提炼 3 个痛点并生成 3 条高情商回复话术
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* 输入区 */}
        <section className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              粉丝评论数据
            </label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="h-80 w-full resize-none rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none backdrop-blur transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/25"
              placeholder="每行一条评论，或粘贴后台导出的评论数据…"
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading || !comments.trim()}
            className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                分析中…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                分析评论并生成回复
              </>
            )}
          </button>
          {error && (
            <p className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          )}

          {/* 历史记录 */}
          {history.length > 0 && (
            <div className="pt-2">
              <button
                onClick={() => setHistoryOpen((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"
              >
                <Clock className="h-3.5 w-3.5" />
                历史记录（{history.length}）
              </button>
              {historyOpen && (
                <ul className="mt-2 space-y-1">
                  {history.map((h) => (
                    <li key={h.id}>
                      <button
                        onClick={() => restore(h)}
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-slate-600 hover:bg-slate-100"
                      >
                        <RotateCcw className="h-3 w-3 shrink-0 text-slate-400" />
                        <span className="truncate">{h.commentsPreview}</span>
                        <span className="ml-auto shrink-0 text-slate-400">
                          {new Date(h.timestamp).toLocaleString("zh-CN", {
                            month: "2-digit",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        {/* 结果区 */}
        <section className="space-y-6">
          {loading && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
                <p className="mt-2 text-sm text-slate-400">
                  AI 正在分析评论情感、提炼痛点、生成回复话术…
                </p>
              </div>
            </div>
          )}
          {!loading && !result && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
              情感分布图 + 痛点卡 + 回复话术将在此展示
            </div>
          )}

          {result && (
            <>
              {/* A. 情感分布 */}
              <div className="glass-card rounded-xl p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <Heart className="h-4 w-4 text-rose-500" />
                  情感分布
                </h2>
                {allZero ? (
                  <p className="py-10 text-center text-sm text-slate-400">
                    无有效评论数据
                  </p>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={70}
                          label
                        >
                          {pieData.map((d, i) => (
                            <Cell key={i} fill={d.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                    {result.sentiment.summary && (
                      <p className="mt-2 text-center text-sm text-slate-600">
                        {result.sentiment.summary}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* B. 痛点提炼 */}
              <div className="glass-card rounded-xl p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  痛点提炼
                </h2>
                <div className="space-y-3">
                  {result.painPoints.map((p, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-100 bg-slate-50/60 p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                          {i + 1}
                        </span>
                        <span className="flex-1 text-sm font-medium text-slate-800">
                          {p.point}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${SEVERITY_STYLE[p.severity]}`}
                        >
                          {p.severity}
                        </span>
                      </div>
                      {p.evidence && (
                        <p className="mt-2 flex items-start gap-1.5 text-xs italic text-slate-500">
                          <Quote className="h-3 w-3 shrink-0 text-slate-400" />
                          <span>{p.evidence}</span>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* C. 回复话术 */}
              <div className="glass-card rounded-xl p-4">
                <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  回复话术
                </h2>
                <div className="space-y-3">
                  {result.replies.map((r, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-slate-100 bg-white p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${TONE_STYLE[r.tone]}`}
                        >
                          {r.tone}
                        </span>
                        {r.target && (
                          <span className="text-xs text-slate-400">
                            针对：{r.target}
                          </span>
                        )}
                        <button
                          onClick={() => copy(r.content, `reply-${i}`)}
                          className="ml-auto shrink-0 text-slate-400 transition-colors hover:text-emerald-600"
                          title="复制"
                        >
                          {copied === `reply-${i}` ? (
                            <Check className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {r.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
