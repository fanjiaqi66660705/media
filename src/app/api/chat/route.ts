import { streamText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

const provider = createOpenAI({
  baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
  apiKey: process.env.LLM_API_KEY ?? "",
})

export async function POST(req: Request) {
  const { messages } = await req.json()
  const result = streamText({
    model: provider.chat(process.env.LLM_MODEL ?? "deepseek-chat"),
    messages,
  })
  return result.toTextStreamResponse()
}
