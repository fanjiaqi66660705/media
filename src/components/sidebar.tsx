"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, PenLine, MessageSquare, LayoutDashboard, Zap } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "总览", fullLabel: "工作台总览", icon: LayoutDashboard },
  { href: "/topic", label: "选题", fullLabel: "选题标题生成器", icon: Sparkles },
  { href: "/typeset", label: "排版", fullLabel: "智能排版配图", icon: PenLine },
  { href: "/comments", label: "复盘", fullLabel: "评论互动复盘", icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="relative flex w-full shrink-0 flex-col bg-slate-900 md:h-screen md:w-60">
      {/* 侧边栏氛围光 */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(400px 260px at 0% 0%, rgba(16,185,129,0.25), transparent 65%), radial-gradient(380px 240px at 100% 100%, rgba(99,102,241,0.22), transparent 65%)",
        }}
      />

      <div className="relative flex h-14 items-center gap-2.5 border-b border-white/10 px-4">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-400 to-sky-500 text-base shadow-lg shadow-emerald-500/30">
          📰
        </span>
        <span className="truncate font-semibold tracking-wide text-white">
          AI 新媒体工作台
        </span>
      </div>

      {/* 手机：横向滑动导航；桌面：纵向导航 */}
      <nav className="relative flex gap-1 overflow-x-auto border-t border-white/10 p-2 md:flex-1 md:flex-col md:gap-0 md:space-y-1.5 md:overflow-visible md:border-t-0 md:p-3">
        {nav.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group relative flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 md:shrink",
                active
                  ? "bg-gradient-to-r from-emerald-500/90 to-sky-500/80 font-medium text-white shadow-lg shadow-emerald-500/25"
                  : "text-slate-400 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 transition-transform duration-200 group-hover:scale-110",
                  active && "drop-shadow",
                )}
              />
              <span className="whitespace-nowrap md:hidden">{item.label}</span>
              <span className="hidden whitespace-nowrap md:inline">{item.fullLabel}</span>
            </Link>
          )
        })}
      </nav>

      <div className="relative hidden border-t border-white/10 p-4 md:block">
        <div className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
          <Zap className="h-4 w-4 text-amber-300" />
          <div className="leading-tight">
            <p className="text-xs font-medium text-slate-200">智谱 GLM-4-Flash</p>
            <p className="text-[10px] text-slate-500">AI 引擎在线</p>
          </div>
          <span className="ml-auto h-2 w-2 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
        </div>
      </div>
    </aside>
  )
}
