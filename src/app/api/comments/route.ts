import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { commentsResultSchema } from "@/lib/schemas"
import { COMMENTS_SYSTEM } from "@/lib/prompts"
import { extractJson, normalizeCommentsResult } from "@/lib/normalize"

const provider = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
  apiKey: process.env.LLM_API_KEY ?? "",
})

export async function POST(req: Request) {
  const { comments } = await req.json()
  try {
    // 弱模型无 JSON 约束能力：先用 generateText 拿纯文本，再在应用层容错解析
    const { text } = await generateText({
      model: provider.chat(process.env.LLM_MODEL ?? "deepseek-chat", {
        maxOutputTokens: 4000,
      }),
      system: COMMENTS_SYSTEM,
      prompt: `粉丝评论数据：
${comments}

只输出纯 JSON，禁止 markdown 代码围栏（不要 \`\`\`），禁止任何解释文字，键名一律用英文（severity 与 tone 的取值仍用中文）。顶层结构示例：
{"sentiment":{"positive":1,"neutral":1,"negative":1,"summary":"整体情感总结"},"painPoints":[{"point":"痛点描述","severity":"高","evidence":"评论原话"}],"replies":[{"tone":"温暖","target":"针对的场景","content":"回复话术"}]}
其中 severity 只能取"高/中/低"，tone 只能取"温暖/专业/幽默"，painPoints 与 replies 必须正好各 3 个元素。`,
    })
    // 剥围栏 → 中文键名/异构形态归一 → Zod 校验兜底
    const parsed = commentsResultSchema.safeParse(normalizeCommentsResult(extractJson(text)))
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
