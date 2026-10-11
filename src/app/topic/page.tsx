"use client"
import { useState, useEffect } from "react"
import { Sparkles, Copy, Check, Loader2, Clock, RotateCcw } from "lucide-react"
import { generateTopicResult } from "@/lib/ai-handlers"

type Title = { formula: string; text: string }
type Direction = {
  direction: string
  angle: string
  clickRateReason: string
  titles: Title[]
}
type TopicResult = { directions: Direction[] }

type HistoryItem = {
  id: string
  topic: string
  tone: string
  directions: Direction[]
  timestamp: number
}

const FORMULAS: Record<string, string> = {
  suspense: "悬念式",
  resonance: "共鸣式",
  number: "数字式",
  contrast: "反差式",
  question: "疑问式",
}

export default function TopicPage() {
  const [topic, setTopic] = useState("")
  const [tone, setTone] = useState("公众号调性")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<TopicResult | null>(null)
  const [copied, setCopied] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("topic-history")
      if (raw) setHistory(JSON.parse(raw))
    } catch {
      /* 忽略 */
    }
  }, [])

  async function generate() {
    if (!topic.trim() || loading) return
    setLoading(true)
    setError("")
    setResult(null)
    try {
      const data = await generateTopicResult({ topic, tone })
      const normalized: TopicResult = {
        directions: data.directions.map((d) => ({
          direction: d.direction,
          angle: d.angle,
          clickRateReason: d.clickRateReason,
          titles: (Object.keys(FORMULAS) as Array<keyof typeof d.titles>).map((key) => ({
            formula: FORMULAS[key],
            text: d.titles[key] ?? "",
          })),
        })),
      }
      setResult(normalized)
      const item: HistoryItem = {
        id: Date.now().toString(),
        topic,
        tone,
        directions: normalized.directions,
        timestamp: Date.now(),
      }
      const next = [item, ...history].slice(0, 20)
      setHistory(next)
      localStorage.setItem("topic-history", JSON.stringify(next))
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : "生成失败，请检查 .env.local 中的 NEXT_PUBLIC_LLM_API_KEY 配置",
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
    setTopic(h.topic)
    setTone(h.tone)
    setResult({ directions: h.directions })
    setError("")
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">选题标题生成器</h1>
        <p className="mt-1 text-sm text-slate-500">
          输入热点关键词，AI 结合青年受众画像生成 5 个选题方向 × 5 种标题公式
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* 输入区 */}
        <section className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              热点 / 主题
            </label>
            <textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="h-32 w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
              placeholder="例如：开学季迎新、考研倒计时、校园秋天…"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <option>公众号调性</option>
              <option>微博调性</option>
            </select>
            <button
              onClick={generate}
              disabled={loading || !topic.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  生成选题与标题
                </>
              )}
            </button>
          </div>
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {/* 历史 */}
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
                        <span className="truncate">{h.topic}</span>
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
        <section className="space-y-4">
          {loading && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300">
              <div className="text-center">
                <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
                <p className="mt-2 text-sm text-slate-400">
                  AI 正在生成 5 个选题方向与 25 条标题…
                </p>
              </div>
            </div>
          )}
          {!loading && !result && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
              AI 生成的选题与标题将在此展示
            </div>
          )}
          {result &&
            result.directions.map((d, i) => (
              <div key={i} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-2">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-800">
                      {d.direction}
                    </h3>
                    <p className="mt-0.5 text-sm text-slate-500">{d.angle}</p>
                    {d.clickRateReason && (
                      <span className="mt-1 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        {d.clickRateReason}
                      </span>
                    )}
                  </div>
                </div>
                <ul className="mt-3 space-y-1.5">
                  {d.titles.map((t, j) => (
                    <li
                      key={j}
                      className="group flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="shrink-0 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600">
                        {t.formula}
                      </span>
                      <span className="flex-1 text-slate-700">{t.text}</span>
                      <button
                        onClick={() => copy(t.text, `${i}-${j}`)}
                        className="shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-emerald-600 group-hover:opacity-100"
                        title="复制"
                      >
                        {copied === `${i}-${j}` ? (
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
        </section>
      </div>
    </div>
  )
}
