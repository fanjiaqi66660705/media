import Link from "next/link"
import { Sparkles, PenLine, MessageSquare } from "lucide-react"

const modules = [
  { href: "/topic", title: "选题标题生成器", desc: "输入热点，AI 生成 5 个选题方向 + 25 条爆款标题", icon: Sparkles, tag: "模块一" },
  { href: "/typeset", title: "智能排版配图助手", desc: "草稿自动结构化排版 + Pexels/Unsplash 免费配图", icon: PenLine, tag: "模块二" },
  { href: "/comments", title: "评论互动复盘助手", desc: "情感分析 + 痛点提炼 + 高情商官方回复话术", icon: MessageSquare, tag: "模块三" },
]

export default function Home() {
  return (
    <div className="p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">AI 新媒体全链路运营工作台</h1>
        <p className="mt-1 text-sm text-slate-500">14 万粉丝团属新媒体矩阵 · 选题 → 排版 → 评论复盘 全流程</p>
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        {modules.map((m) => {
          const Icon = m.icon
          return (
            <Link key={m.href} href={m.href} className="group rounded-xl border border-slate-200 p-5 transition-colors hover:border-emerald-400 hover:bg-slate-50">
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs text-slate-400">{m.tag}</span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-800 group-hover:text-emerald-700">{m.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{m.desc}</p>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
