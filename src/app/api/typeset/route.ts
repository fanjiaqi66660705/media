import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { typesetResultSchema } from "@/lib/schemas"
import { LAYOUT_SYSTEM } from "@/lib/prompts"
import { extractJson, normalizeTypesetResult } from "@/lib/normalize"

const provider = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
  apiKey: process.env.LLM_API_KEY ?? "",
})

export async function POST(req: Request) {
  const { draft } = await req.json()
  try {
    // 弱模型无 JSON 约束能力：先用 generateText 拿纯文本，再在应用层容错解析
    const { text } = await generateText({
      model: provider.chat(process.env.LLM_MODEL ?? "deepseek-chat"),
      maxOutputTokens: 4000,
      system: LAYOUT_SYSTEM,
      prompt: `草稿正文：${draft}

只输出纯 JSON，禁止 markdown 代码围栏（不要 \`\`\`），禁止任何解释文字，键名一律用英文。顶层结构示例：
{"title":"公众号标题","intro":{"content":"引言正文","imageKeywords":["关键词1","关键词2"]},"arguments":[{"subtitle":"分论点小标题","content":"分论点正文","imageKeywords":["关键词1","关键词2"]}],"highlights":["金句"],"ending":{"content":"结尾正文","imageKeywords":["关键词1","关键词2"]}}
其中 arguments 必须包含 2-4 个元素。`,
    })
    // 剥围栏 → 中文键名/异构形态归一 → Zod 校验兜底
    const parsed = typesetResultSchema.safeParse(normalizeTypesetResult(extractJson(text)))
    if (!parsed.success) {
      const issue = parsed.error.issues[0]
      const summary = issue
        ? `${issue.path.map(String).join(".")}: ${issue.message}`
        : "未知问题"
      return Response.json({ error: "AI 输出结构异常: " + summary }, { status: 500 })
    }
    return Response.json(parsed.data)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "生成失败"
    return Response.json({ error: msg }, { status: 500 })
  }
}
