// 浏览器端直连 LLM（OpenAI 兼容协议）
// 静态导出后无服务端代理，凭据经 NEXT_PUBLIC_ 前缀注入客户端包（部署目标为公开静态站点）
const BASE_URL = (process.env.NEXT_PUBLIC_LLM_BASE_URL ?? "").replace(/\/+$/, "")
const API_KEY = process.env.NEXT_PUBLIC_LLM_API_KEY ?? ""
const MODEL = process.env.NEXT_PUBLIC_LLM_MODEL ?? "glm-4-flash"

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string }

// 底层对话补全：POST {BASE_URL}/chat/completions，返回 choices[0].message.content
export async function chatCompletion(options: {
  messages: ChatMessage[]
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: options.messages,
      max_tokens: options.maxTokens ?? 4000,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`LLM 请求失败 (${res.status}): ${body.slice(0, 200)}`)
  }
  const data = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: unknown } }>
  } | null
  const content = data?.choices?.[0]?.message?.content
  if (typeof content !== "string") {
    throw new Error(
      `LLM 响应缺少 choices[0].message.content: ${JSON.stringify(data ?? {}).slice(0, 200)}`,
    )
  }
  return content
}

// 单轮调用封装：system + user → 补全文本
export async function callLLM(options: {
  system?: string
  user: string
  maxTokens?: number
  temperature?: number
}): Promise<string> {
  const messages: ChatMessage[] = []
  if (options.system) messages.push({ role: "system", content: options.system })
  messages.push({ role: "user", content: options.user })
  return chatCompletion({
    messages,
    maxTokens: options.maxTokens,
    temperature: options.temperature,
  })
}
