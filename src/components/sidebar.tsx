"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Sparkles, PenLine, MessageSquare, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

const nav = [
  { href: "/", label: "工作台总览", icon: LayoutDashboard },
  { href: "/topic", label: "选题标题生成器", icon: Sparkles },
  { href: "/typeset", label: "智能排版配图", icon: PenLine },
  { href: "/comments", label: "评论互动复盘", icon: MessageSquare },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-slate-200 bg-slate-50">
      <div className="flex h-14 items-center gap-2 border-b border-slate-200 px-4">
        <span className="text-lg">📰</span>
        <span className="font-semibold text-slate-800">AI 新媒体工作台</span>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {nav.map((item) => {
          const active = pathname === item.href
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-emerald-50 font-medium text-emerald-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
