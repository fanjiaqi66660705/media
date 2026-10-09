import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"
import { topicResultSchema } from "@/lib/schemas"
import { TOPIC_SYSTEM } from "@/lib/prompts"
import { extractJson, normalizeTopicResult } from "@/lib/normalize"

const provider = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
  apiKey: process.env.LLM_API_KEY ?? "",
})

export async function POST(req: Request) {
  const { topic, tone } = await req.json()
  try {
    // 弱模型无 JSON 约束能力：先用 generateText 拿纯文本，再在应用层容错解析
    const { text } = await generateText({
      model: provider.chat(process.env.LLM_MODEL ?? "deepseek-chat", {
        maxOutputTokens: 4000,
      }),
      system: `${TOPIC_SYSTEM}\n当前调性要求：${tone}`,
      prompt: `热点/主题：${topic}

只输出纯 JSON，禁止 markdown 代码围栏（不要 \`\`\`），禁止任何解释文字，键名一律用英文。顶层结构示例：
{"directions":[{"direction":"选题方向","angle":"切入点","clickRateReason":"预估点击率理由","titles":{"suspense":"悬念式标题","resonance":"共鸣式标题","number":"数字式标题","contrast":"反差式标题","question":"疑问式标题"}}]}
其中 directions 必须正好包含 5 个元素。`,
    })
    // 剥围栏 → 中文键名/异构形态归一 → Zod 校验兜底
    const parsed = topicResultSchema.safeParse(normalizeTopicResult(extractJson(text)))
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
