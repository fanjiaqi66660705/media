// AI 处理函数（浏览器端版本）：原 src/app/api/*/route.ts 的逻辑移植
// 流程：构建提示词 → callLLM 拿纯文本 → extractJson → normalize* → Zod safeParse 兜底
// 入参出参与原 API 保持一致，页面层只需把 fetch('/api/xxx') 换成本文件中的函数
import { z } from "zod"
import {
  topicResultSchema,
  typesetResultSchema,
  commentsResultSchema,
  type TopicResult,
  type TypesetResult,
  type CommentsResult,
} from "@/lib/schemas"
import { TOPIC_SYSTEM, LAYOUT_SYSTEM, COMMENTS_SYSTEM } from "@/lib/prompts"
import {
  extractJson,
  normalizeTopicResult,
  normalizeTypesetResult,
  normalizeCommentsResult,
} from "@/lib/normalize"
import { callLLM, chatCompletion, type ChatMessage } from "@/lib/llm-client"

// Zod 校验失败时统一抛错（错误文案与原 API 返回的 error 一致）
function parseOrThrow<T>(schema: z.ZodType<T>, data: unknown): T {
  const parsed = schema.safeParse(data)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const summary = issue
      ? `${issue.path.map(String).join(".")}: ${issue.message}`
      : "未知问题"
    throw new Error("AI 输出结构异常: " + summary)
  }
  return parsed.data
}

// JSON 解析/校验失败自动重试一次：弱模型输出不稳定，重试通常可恢复
const JSON_FIX_HINT =
  "\n\n注意：你上一次的输出无法解析为合法 JSON。本次只输出一个合法 JSON 对象：字符串值内如需引号请使用中文引号，不要在字符串中出现未转义的英文双引号或裸换行，禁止 markdown 围栏和任何解释文字。"

async function callLLMJson<T>(
  opts: { system: string; user: string; maxTokens: number },
  parse: (text: string) => T,
): Promise<T> {
  let lastErr: unknown
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await callLLM({
        system: opts.system,
        user: attempt === 0 ? opts.user : opts.user + JSON_FIX_HINT,
        maxTokens: opts.maxTokens,
      })
      return parse(text)
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr
}

// ---------- 模块一：选题标题（原 /api/topic） ----------

export async function generateTopicResult(input: {
  topic: string
  tone: string
}): Promise<TopicResult> {
  // 弱模型无 JSON 约束能力：先拿纯文本，再在应用层容错解析（失败自动重试）
  return callLLMJson(
    {
      system: `${TOPIC_SYSTEM}\n当前调性要求：${input.tone}`,
      user: `热点/主题：${input.topic}

只输出纯 JSON，禁止 markdown 代码围栏（不要 \`\`\`），禁止任何解释文字，键名一律用英文。顶层结构示例：
{"directions":[{"direction":"选题方向","angle":"切入点","clickRateReason":"预估点击率理由","titles":{"suspense":"悬念式标题","resonance":"共鸣式标题","number":"数字式标题","contrast":"反差式标题","question":"疑问式标题"}}]}
其中 directions 必须正好包含 5 个元素。`,
      maxTokens: 4000,
    },
    (text) => parseOrThrow(topicResultSchema, normalizeTopicResult(extractJson(text))),
  )
}

// ---------- 模块二：智能排版配图（原 /api/typeset） ----------

export async function generateTypesetResult(input: {
  draft: string
}): Promise<TypesetResult> {
  return callLLMJson(
    {
      system: LAYOUT_SYSTEM,
      user: `草稿正文：${input.draft}

只输出纯 JSON，禁止 markdown 代码围栏（不要 \`\`\`），禁止任何解释文字，键名一律用英文。顶层结构示例：
{"title":"公众号标题","intro":{"content":"引言正文","imageKeywords":["关键词1","关键词2"]},"arguments":[{"subtitle":"分论点小标题","content":"分论点正文","imageKeywords":["关键词1","关键词2"]}],"highlights":["金句"],"ending":{"content":"结尾正文","imageKeywords":["关键词1","关键词2"]}}
其中 arguments 必须包含 2-4 个元素。`,
      maxTokens: 4000,
    },
    (text) => parseOrThrow(typesetResultSchema, normalizeTypesetResult(extractJson(text))),
  )
}

// ---------- 模块三：评论互动复盘（原 /api/comments） ----------

export async function generateCommentsResult(input: {
  comments: string
}): Promise<CommentsResult> {
  return callLLMJson(
    {
      system: COMMENTS_SYSTEM,
      user: `粉丝评论数据：
${input.comments}

只输出纯 JSON，禁止 markdown 代码围栏（不要 \`\`\`），禁止任何解释文字，键名一律用英文（severity 与 tone 的取值仍用中文）。顶层结构示例：
{"sentiment":{"positive":1,"neutral":1,"negative":1,"summary":"整体情感总结"},"painPoints":[{"point":"痛点描述","severity":"高","evidence":"评论原话"}],"replies":[{"tone":"温暖","target":"针对的场景","content":"回复话术"}]}
其中 severity 只能取"高/中/低"，tone 只能取"温暖/专业/幽默"，painPoints 与 replies 必须正好各 3 个元素。`,
      maxTokens: 4000,
    },
    (text) => parseOrThrow(commentsResultSchema, normalizeCommentsResult(extractJson(text))),
  )
}

// ---------- 通用对话补全（原 /api/chat，流式改整段返回） ----------

export async function generateChatReply(input: {
  messages: ChatMessage[]
}): Promise<string> {
  return chatCompletion({ messages: input.messages })
}

// ---------- Pexels 配图检索（原 /api/images，浏览器端直连） ----------

export type Photo = {
  id: number
  thumb: string
  full: string
  alt: string
  photographer: string
  photographerUrl: string
  link: string
}

export type ImageSearchResult = { photos: Photo[]; notice?: string; error?: string }

export async function searchImages(query: string): Promise<ImageSearchResult> {
  if (!query) return { photos: [] }
  const key = process.env.NEXT_PUBLIC_PEXELS_API_KEY
  if (!key) {
    return { photos: [], notice: "未配置 NEXT_PUBLIC_PEXELS_API_KEY，配图功能不可用" }
  }
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&locale=zh-CN`,
      { headers: { Authorization: key } },
    )
    if (!res.ok) {
      return { photos: [], notice: `Pexels 请求失败 ${res.status}` }
    }
    const data = (await res.json()) as {
      photos?: Array<{
        id: number
        photographer: string
        photographer_url: string
        src: { medium: string; large: string }
        alt: string
        url: string
      }>
    }
    const photos = (data.photos ?? []).map((p) => ({
      id: p.id,
      thumb: p.src.medium,
      full: p.src.large,
      alt: p.alt,
      photographer: p.photographer,
      photographerUrl: p.photographer_url,
      link: p.url,
    }))
    return { photos }
  } catch (e: unknown) {
    return { photos: [], error: e instanceof Error ? e.message : "图片检索失败" }
  }
}
