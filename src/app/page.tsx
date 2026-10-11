import Link from "next/link"
import { Sparkles, PenLine, MessageSquare, ArrowRight, Users, Layers, Zap } from "lucide-react"

const modules = [
  {
    href: "/topic",
    title: "选题标题生成器",
    desc: "输入热点，AI 生成 5 个选题方向 + 25 条爆款标题",
    icon: Sparkles,
    tag: "模块一",
    iconBg: "from-emerald-400 to-teal-500",
    glow: "group-hover:shadow-emerald-500/30",
    ring: "group-hover:ring-emerald-300/60",
  },
  {
    href: "/typeset",
    title: "智能排版配图助手",
    desc: "草稿自动结构化排版 + Pexels/Unsplash 免费配图",
    icon: PenLine,
    tag: "模块二",
    iconBg: "from-sky-400 to-blue-500",
    glow: "group-hover:shadow-sky-500/30",
    ring: "group-hover:ring-sky-300/60",
  },
  {
    href: "/comments",
    title: "评论互动复盘助手",
    desc: "情感分析 + 痛点提炼 + 高情商官方回复话术",
    icon: MessageSquare,
    tag: "模块三",
    iconBg: "from-violet-400 to-purple-500",
    glow: "group-hover:shadow-violet-500/30",
    ring: "group-hover:ring-violet-300/60",
  },
]

const stats = [
  { icon: Users, label: "14 万粉丝", sub: "团属新媒体矩阵" },
  { icon: Layers, label: "3 大模块", sub: "全链路覆盖" },
  { icon: Zap, label: "秒级生成", sub: "GLM-4-Flash 驱动" },
]

export default function Home() {
  return (
    <div className="p-5 sm:p-8">
      <header className="fade-up mb-8 sm:mb-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-xs font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
          AI 新媒体全链路运营工作台
        </span>
        <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          选题 · 排版 · 复盘
          <br />
          <span className="text-gradient">一个工作台搞定新媒体运营</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-slate-500">
          面向 14 万粉丝团属新媒体矩阵，把选题策划、智能排版、评论复盘串成一条 AI 流水线。
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 min-[420px]:grid-cols-3 sm:flex sm:flex-wrap sm:gap-3">
          {stats.map((s) => {
            const Icon = s.icon
            return (
              <div
                key={s.label}
                className="glass-card flex items-center gap-3 rounded-2xl px-4 py-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900/5 text-slate-700">
                  <Icon className="h-4.5 w-4.5" />
                </span>
                <div className="leading-tight">
                  <p className="text-sm font-semibold text-slate-800">{s.label}</p>
                  <p className="text-xs text-slate-400">{s.sub}</p>
                </div>
              </div>
            )
          })}
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-3">
        {modules.map((m, i) => {
          const Icon = m.icon
          return (
            <Link
              key={m.href}
              href={m.href}
              style={{ animationDelay: `${0.08 * (i + 1)}s` }}
              className={`glass-card group fade-up relative overflow-hidden rounded-2xl p-5 ring-1 ring-transparent transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl sm:p-6 ${m.glow} ${m.ring}`}
            >
              <div className="flex items-start justify-between">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${m.iconBg} text-white shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}
                >
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-xs font-medium tracking-wider text-slate-400">
                  {m.tag}
                </span>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-slate-900 group-hover:text-slate-900">
                {m.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{m.desc}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-slate-400 transition-colors group-hover:text-emerald-600">
                开始使用
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </span>
            </Link>
          )
        })}
      </section>
    </div>
  )
}
