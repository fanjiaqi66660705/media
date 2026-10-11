import type { Metadata } from "next"
import { Sidebar } from "@/components/sidebar"
import "./globals.css"

export const metadata: Metadata = {
  title: "AI 新媒体全链路运营工作台",
  description: "选题策划 · 智能排版 · 评论复盘 — 一站式 AI 运营工作台",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        <div className="aurora-bg" aria-hidden />
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}
