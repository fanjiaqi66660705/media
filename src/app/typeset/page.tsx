"use client"
import { useState, useEffect } from "react"
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Image as ImageIcon,
  Quote,
  PenLine,
  MessageSquare,
  Clock,
  RotateCcw,
  ExternalLink,
} from "lucide-react"
import { generateTypesetResult, searchImages } from "@/lib/ai-handlers"

// 本地渲染类型（后端 TypesetResult 的前端镜像；arguments 作为 key 访问，类型别名另起）
type IntroSection = { content: string; imageKeywords: string[] }
type PointSection = { subtitle: string; content: string; imageKeywords: string[] }
type EndingSection = { content: string; imageKeywords: string[] }
type TypesetResult = {
  title: string
  intro: IntroSection
  arguments: PointSection[]
  highlights: string[]
  ending: EndingSection
}

// Pexels 配图候选
type Photo = {
  id: number
  thumb: string
  full: string
  alt: string
  photographer: string
  photographerUrl: string
  link: string
}

type HistoryItem = {
  id: string
  draftPreview: string
  title: string
  timestamp: number
}

export default function TypesetPage() {
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [result, setResult] = useState<TypesetResult | null>(null)
  const [copied, setCopied] = useState("")
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)

  // 配图相关状态：key 形如 `${sectionId}-${keyword}`
  const [imageResults, setImageResults] = useState<Record<string, Photo[]>>({})
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({})
  const [imageNotice, setImageNotice] = useState<Record<string, string>>({})
  const [enlarged, setEnlarged] = useState<Photo | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem("typeset-history")
      if (raw) setHistory(JSON.parse(raw))
    } catch {
      /* 忽略 */
    }
  }, [])

  async function generate() {
    if (!draft.trim() || loading) return
    setLoading(true)
    setError("")
    setResult(null)
    setImageResults({})
    setImageLoading({})
    setImageNotice({})
    try {
      const data = await generateTypesetResult({ draft })
      setResult(data)
      const item: HistoryItem = {
        id: Date.now().toString(),
        draftPreview: draft,
        title: data.title ?? "",
        timestamp: Date.now(),
      }
      const next = [item, ...history].slice(0, 10)
      setHistory(next)
      localStorage.setItem("typeset-history", JSON.stringify(next))
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

  async function fetchImages(sectionId: string, keyword: string) {
    const key = `${sectionId}-${keyword}`
    setImageLoading((s) => ({ ...s, [key]: true }))
    setImageNotice((s) => {
      const next = { ...s }
      delete next[key]
      return next
    })
    try {
      const data = await searchImages(keyword)
      const notice = data.notice
      if (notice) {
        setImageNotice((s) => ({ ...s, [key]: notice }))
      }
      setImageResults((s) => ({ ...s, [key]: data.photos ?? [] }))
    } catch {
      setImageNotice((s) => ({ ...s, [key]: "图片检索失败" }))
      setImageResults((s) => ({ ...s, [key]: [] }))
    } finally {
      setImageLoading((s) => ({ ...s, [key]: false }))
    }
  }

  function restore(h: HistoryItem) {
    setDraft(h.draftPreview)
    setError("")
    setResult(null)
    setImageResults({})
    setImageLoading({})
    setImageNotice({})
  }

  // 渲染配图候选区域
  function renderImageKeywords(sectionId: string, keywords: string[]) {
    if (!keywords || keywords.length === 0) return null
    return (
      <div className="mt-3 border-t border-slate-100 pt-3">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <ImageIcon className="h-3.5 w-3.5" />
          配图候选
        </div>
        <div className="flex flex-col gap-2">
          {keywords.map((kw) => {
            const key = `${sectionId}-${kw}`
            const photos = imageResults[key]
            const isLoading = imageLoading[key]
            const notice = imageNotice[key]
            return (
              <div key={kw}>
                <button
                  onClick={() => fetchImages(sectionId, kw)}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 transition-colors hover:bg-emerald-100 disabled:opacity-50"
                >
                  <ImageIcon className="h-3 w-3" />
                  {isLoading ? "检索中…" : kw}
                </button>
                {notice && (
                  <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-xs text-amber-700">
                    {notice}。可先用关键词自行检索，或在 .env.local 添加
                    NEXT_PUBLIC_PEXELS_API_KEY（参考 .env.example）。
                  </p>
                )}
                {photos && photos.length === 0 && !isLoading && !notice && (
                  <p className="mt-1.5 text-xs text-slate-400">无可用图片</p>
                )}
                {photos && photos.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {photos.map((p) => (
                      <figure key={p.id} className="w-32">
                        <button
                          onClick={() => setEnlarged(p)}
                          className="block overflow-hidden rounded-md border border-slate-200"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={p.thumb}
                            alt={p.alt}
                            className="h-20 w-full object-cover"
                          />
                        </button>
                        <figcaption className="mt-1 text-[10px] leading-tight text-slate-400">
                          <a
                            href={p.link}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-0.5 hover:text-emerald-600"
                          >
                            {p.photographer}
                            <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <header className="mb-6">
        <h1 className="text-gradient text-2xl font-bold">智能排版配图助手</h1>
        <p className="mt-1 text-sm text-slate-500">
          草稿自动结构化 + 免费可商用配图推荐
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        {/* 输入区 */}
        <section className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              草稿正文
            </label>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="h-80 w-full resize-none rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm outline-none backdrop-blur transition focus:border-sky-500 focus:ring-2 focus:ring-sky-500/25"
              placeholder="粘贴你的纯文本草稿…"
            />
          </div>
          <button
            onClick={generate}
            disabled={loading || !draft.trim()}
            className="btn-gradient flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                生成中…
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                生成排版与配图
              </>
            )}
          </button>
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
                        <span className="truncate">{h.draftPreview}</span>
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
                  AI 正在结构化排版并提取配图关键词…
                </p>
              </div>
            </div>
          )}
          {!loading && !result && (
            <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-400">
              结构化排版预览 + 配图候选将在此展示
            </div>
          )}
          {result && (
            <div className="space-y-4">
              {/* 标题 */}
              <div className="glass-card rounded-xl p-4">
                <h2 className="text-lg font-bold text-slate-900">
                  {result.title}
                </h2>
              </div>

              {/* 引言 */}
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <PenLine className="h-4 w-4" />
                  引言
                </div>
                <p className="group mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="flex-1 whitespace-pre-wrap">
                    {result.intro.content}
                  </span>
                  <button
                    onClick={() => copy(result.intro.content, "intro")}
                    className="shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-emerald-600 group-hover:opacity-100"
                    title="复制"
                  >
                    {copied === "intro" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </p>
                {renderImageKeywords("intro", result.intro.imageKeywords)}
              </div>

              {/* 分论点 */}
              {result.arguments.map((arg, i) => (
                <div key={i} className="glass-card rounded-xl p-4">
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-semibold text-emerald-700">
                      {i + 1}
                    </span>
                    <h3 className="flex-1 font-semibold text-slate-800">
                      {arg.subtitle}
                    </h3>
                  </div>
                  <p className="group mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                    <span className="flex-1 whitespace-pre-wrap">
                      {arg.content}
                    </span>
                    <button
                      onClick={() => copy(arg.content, `arg-${i}`)}
                      className="shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-emerald-600 group-hover:opacity-100"
                      title="复制"
                    >
                      {copied === `arg-${i}` ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </p>
                  {renderImageKeywords(`arg-${i}`, arg.imageKeywords)}
                </div>
              ))}

              {/* 金句高亮 */}
              {result.highlights.map((h, i) => (
                <blockquote
                  key={i}
                  className="flex items-start gap-2 rounded-xl border-l-4 border-emerald-500 bg-emerald-50/50 p-4 italic"
                >
                  <Quote className="h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="flex-1 font-semibold text-slate-800">{h}</p>
                </blockquote>
              ))}

              {/* 结尾 */}
              <div className="glass-card rounded-xl p-4">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <MessageSquare className="h-4 w-4" />
                  结尾
                </div>
                <p className="group mt-2 flex items-start gap-2 text-sm leading-relaxed text-slate-700">
                  <span className="flex-1 whitespace-pre-wrap">
                    {result.ending.content}
                  </span>
                  <button
                    onClick={() => copy(result.ending.content, "ending")}
                    className="shrink-0 text-slate-400 opacity-0 transition-opacity hover:text-emerald-600 group-hover:opacity-100"
                    title="复制"
                  >
                    {copied === "ending" ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </p>
                {renderImageKeywords("ending", result.ending.imageKeywords)}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 图片放大层 */}
      {enlarged && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
          onClick={() => setEnlarged(null)}
        >
          <div
            className="relative max-h-full max-w-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={enlarged.full}
              alt={enlarged.alt}
              className="max-h-[80vh] max-w-full rounded-lg"
            />
            <div className="mt-2 text-center text-xs text-white/80">
              图源：
              <a
                href={enlarged.link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-0.5 underline hover:text-white"
              >
                {enlarged.photographer} on Pexels
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <button
              onClick={() => setEnlarged(null)}
              className="absolute right-2 top-2 rounded-full bg-white/20 px-2 py-0.5 text-sm text-white hover:bg-white/30"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
