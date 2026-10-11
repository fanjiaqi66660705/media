// 弱模型 JSON 输出容错层
// glm-4-flash 这类免费小模型不具备稳定的 JSON 约束能力，常见问题：
// 输出被 ```json 围栏包裹、键名是中文、titles 是"单键对象数组"等异构形态。
// 这里统一做"剥围栏 → 键名别名映射 → 数组/对象形态归一 → 缺失补空"，
// 归一后的数据仍交给 schemas.ts 的 Zod schema 做最终校验。
import type {
  CommentsResult,
  TopicResult,
  TypesetResult,
} from "@/lib/schemas"

// ---------- 通用工具 ----------

// 从模型原始输出提取 JSON：剥掉 markdown 围栏，再从首个 { 或 [ 截到最后一个 } 或 ]
export function extractJson(raw: string): unknown {
  let text = (raw ?? "").trim()
  // 剥掉成对的 ```json ... ``` / ``` ... ``` 围栏
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) text = fenced[1].trim()
  // 兜底：围栏未闭合时也能截出 JSON 主体
  const start = text.search(/[{[]/)
  if (start > 0) text = text.slice(start)
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"))
  if (end !== -1) text = text.slice(0, end + 1)
  // 兜底清理：对象/数组字面量尾逗号（弱模型常见）
  text = text.replace(/,(\s*[}\]])/g, "$1")
  try {
    return JSON.parse(text)
  } catch {
    throw new Error("AI 输出不是有效 JSON")
  }
}

// 按别名表依次取第一个命中值（跳过 undefined/null/空串）
function pick(obj: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = obj[k]
    if (v !== undefined && v !== null && v !== "") return v
  }
  return undefined
}

// 任意值 → 字符串，缺失补空串
function str(v: unknown): string {
  if (typeof v === "string") return v
  if (typeof v === "number" || typeof v === "boolean") return String(v)
  return ""
}

// 任意值 → 非负整数，兼容 "3条" 这类字符串计数
function int(v: unknown): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.round(v))
  if (typeof v === "string") {
    const m = v.match(/\d+/)
    if (m) return Math.max(0, parseInt(m[0], 10))
  }
  return 0
}

// 列表归一：数组直接用；对象若含已知字段键视作单元素，否则取值集合；其他视作空列表
function toList(raw: unknown, fieldKeys: string[]): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>
    if (fieldKeys.some((k) => k in rec)) return [rec]
    return Object.values(rec)
  }
  return []
}

// 对象或"单键对象数组"归并为一个 Record，便于按别名取值
function toRecord(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (Array.isArray(raw)) {
    const merged: Record<string, unknown> = {}
    for (const item of raw) {
      if (item && typeof item === "object" && !Array.isArray(item)) {
        Object.assign(merged, item as Record<string, unknown>)
      }
    }
    return merged
  }
  return {}
}

// ---------- 模块一：选题标题（topicResultSchema） ----------

type DirectionItem = TopicResult["directions"][number]
type TitlesItem = DirectionItem["titles"]

// 五种标题公式的键名别名（英文优先，中文别名兜底）
const TITLE_ALIASES: Array<[keyof TitlesItem, string[]]> = [
  ["suspense", ["suspense", "悬念式", "悬念"]],
  ["resonance", ["resonance", "共鸣式", "共鸣"]],
  ["number", ["number", "数字式", "数字"]],
  ["contrast", ["contrast", "反差式", "反差"]],
  ["question", ["question", "疑问式", "疑问"]],
]

// titles 兼容三种形态：对象（按键名映射）、单键对象数组（合并）、字符串数组（按顺序填）
function normalizeTitles(raw: unknown): TitlesItem {
  const out: TitlesItem = { suspense: "", resonance: "", number: "", contrast: "", question: "" }
  const fill = (item: unknown, index?: number) => {
    if (typeof item === "string") {
      // 纯字符串数组兜底：按出现顺序对应五式
      const entry = index !== undefined ? TITLE_ALIASES[index] : undefined
      if (entry && !out[entry[0]]) out[entry[0]] = item
      return
    }
    if (!item || typeof item !== "object") return
    const rec = item as Record<string, unknown>
    for (const [key, aliases] of TITLE_ALIASES) {
      const v = pick(rec, aliases)
      if (v !== undefined && !out[key]) out[key] = str(v)
    }
  }
  if (Array.isArray(raw)) raw.forEach((item, i) => fill(item, i))
  else fill(raw)
  return out
}

const DIRECTION_ALIASES = ["direction", "选题标题方向", "选题方向", "方向", "标题方向"]
const ANGLE_ALIASES = ["angle", "切入点"]
const CLICKRATE_ALIASES = ["clickRateReason", "预估点击率理由", "点击率理由", "预估点击率"]

function normalizeDirection(raw: unknown): DirectionItem {
  const rec = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
  return {
    direction: str(pick(rec, DIRECTION_ALIASES)),
    angle: str(pick(rec, ANGLE_ALIASES)),
    clickRateReason: str(pick(rec, CLICKRATE_ALIASES)),
    titles: normalizeTitles(pick(rec, ["titles", "标题", "五种标题", "标题列表", "五个标题"])),
  }
}

// 兼容顶层数组（包成 {directions}）、顶层数组键、顶层单方向对象三种形态；
// 方向不足 5 个不报错，有几个算几个（最终由 Zod 校验兜底）
export function normalizeTopicResult(raw: unknown): TopicResult {
  let list: unknown[]
  if (Array.isArray(raw)) {
    list = raw
  } else if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>
    const arr = pick(rec, ["directions", "选题方向", "选题方向列表", "方向列表", "方向", "选题"])
    if (Array.isArray(arr)) {
      list = arr
    } else {
      // 既无数组键：取值中的多个对象（如"选题1/选题2"式）当列表，否则整体视作单个方向
      const objValues = Object.values(rec).filter(
        (v) => v && typeof v === "object" && !Array.isArray(v),
      )
      list = objValues.length > 1 ? objValues : [rec]
    }
  } else {
    list = []
  }
  return { directions: list.map(normalizeDirection) }
}

// ---------- 模块二：智能排版配图（typesetResultSchema） ----------

type IntroItem = TypesetResult["intro"]
type ArgumentItem = TypesetResult["arguments"][number]

const TITLE_ALIASES_T = ["title", "标题", "文章标题", "公众号标题"]
const INTRO_ALIASES = ["intro", "引言", "开头", "导语"]
const CONTENT_ALIASES = ["content", "正文", "内容", "文字"]
const KEYWORDS_ALIASES = ["imageKeywords", "配图关键词", "图片关键词", "检索关键词", "关键词", "配图"]
const ARGUMENTS_ALIASES = ["arguments", "分论点", "分论点列表", "论点", "正文论点"]
const SUBTITLE_ALIASES = ["subtitle", "小标题", "分论点小标题", "论点标题", "标题"]
const HIGHLIGHTS_ALIASES = ["highlights", "金句", "金句高亮", "金句列表", "高亮", "亮点金句"]
const ENDING_ALIASES = ["ending", "结尾", "结尾互动", "结束"]

// 配图关键词归一：字符串按分隔符拆分 / 数组逐项转字符串 / 对象取值集合；
// 截断到 3 个、不足 2 个补空串（满足 schema 的 min(2)/max(3)）
function toKeywords(raw: unknown): string[] {
  let list: unknown[]
  if (typeof raw === "string") {
    list = raw.split(/[,，、;；\s]+/).filter(Boolean)
  } else if (Array.isArray(raw)) {
    list = raw
  } else if (raw && typeof raw === "object") {
    const rec = raw as Record<string, unknown>
    const arr = pick(rec, ["keywords", "关键词", "items"])
    list = Array.isArray(arr) ? arr : Object.values(rec)
  } else {
    list = []
  }
  const out = list.map(str).filter((s) => s !== "").slice(0, 3)
  while (out.length < 2) out.push("")
  return out
}

// 引言/结尾共用结构 {content, imageKeywords}，兼容直接给字符串的形态
function normalizeSection(raw: unknown): IntroItem {
  if (typeof raw === "string") {
    return { content: raw, imageKeywords: ["", ""] }
  }
  const rec = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
  return {
    content: str(pick(rec, CONTENT_ALIASES)),
    imageKeywords: toKeywords(pick(rec, KEYWORDS_ALIASES)),
  }
}

function normalizeArgument(raw: unknown): ArgumentItem {
  if (typeof raw === "string") {
    return { subtitle: "", content: raw, imageKeywords: ["", ""] }
  }
  const rec = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
  return {
    subtitle: str(pick(rec, SUBTITLE_ALIASES)),
    content: str(pick(rec, CONTENT_ALIASES)),
    imageKeywords: toKeywords(pick(rec, KEYWORDS_ALIASES)),
  }
}

// 金句归一：字符串 / 数组 / 对象取值；截断到 2 条、至少 1 条（满足 schema 的 min(1)/max(2)）
function normalizeHighlights(raw: unknown): string[] {
  let list: unknown[]
  if (typeof raw === "string") list = [raw]
  else if (Array.isArray(raw)) list = raw
  else if (raw && typeof raw === "object") list = Object.values(raw as Record<string, unknown>)
  else list = []
  const out = list.map(str).filter((s) => s !== "").slice(0, 2)
  if (out.length === 0) out.push("")
  return out
}

export function normalizeTypesetResult(raw: unknown): TypesetResult {
  const rec = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
  // 分论点：超过 4 个截断、不足 2 个补空分论点（满足 schema 的 min(2)/max(4)）
  const args = toList(pick(rec, ARGUMENTS_ALIASES), [
    "subtitle", "小标题", "标题", "content", "正文", "分论点",
  ]).map(normalizeArgument).slice(0, 4)
  while (args.length < 2) args.push({ subtitle: "", content: "", imageKeywords: ["", ""] })
  return {
    title: str(pick(rec, TITLE_ALIASES_T)),
    intro: normalizeSection(pick(rec, INTRO_ALIASES)),
    arguments: args,
    highlights: normalizeHighlights(pick(rec, HIGHLIGHTS_ALIASES)),
    ending: normalizeSection(pick(rec, ENDING_ALIASES)),
  }
}

// ---------- 模块三：评论互动复盘（commentsResultSchema） ----------

type PainPointItem = CommentsResult["painPoints"][number]
type ReplyItem = CommentsResult["replies"][number]

const SENTIMENT_ALIASES = ["sentiment", "情感", "情感分析", "情感分布", "整体情感"]
const POSITIVE_ALIASES = ["positive", "正面", "正面评论", "正面评论条数", "正面条数", "好评"]
const NEUTRAL_ALIASES = ["neutral", "中性", "中性评论", "中性评论条数", "中性条数"]
const NEGATIVE_ALIASES = ["negative", "负面", "负面评论", "负面评论条数", "负面条数", "差评"]
const SUMMARY_ALIASES = [
  "summary", "整体情感态势一句话总结", "整体情感态势总结", "态势总结", "整体态势", "一句话总结", "总结",
]
const PAINPOINTS_ALIASES = ["painPoints", "pain_points", "痛点", "痛点提炼", "痛点列表", "粉丝痛点"]
const POINT_ALIASES = ["point", "痛点描述", "描述", "痛点", "问题"]
const SEVERITY_ALIASES = ["severity", "严重程度", "程度"]
const EVIDENCE_ALIASES = ["evidence", "证据/原话摘要", "证据", "原话摘要", "原话", "评论证据"]
const REPLIES_ALIASES = ["replies", "回复", "回复话术", "回复话术列表", "官方回复", "高情商回复"]
const TONE_ALIASES = ["tone", "回复基调", "基调", "语气"]
const TARGET_ALIASES = ["target", "针对的痛点或评论场景", "针对场景", "针对痛点", "场景"]
const REPLY_CONTENT_ALIASES = ["content", "回复话术全文", "回复内容", "话术", "回复正文", "全文"]

// 严重程度枚举归一：英文/变体 → "高"|"中"|"低"，识别不出时取"中"
function toSeverity(v: unknown): "高" | "中" | "低" {
  const k = str(v).trim().toLowerCase()
  if (["高", "high", "严重"].includes(k)) return "高"
  if (["低", "low", "轻微"].includes(k)) return "低"
  return "中"
}

// 回复基调枚举归一：英文/变体 → "温暖"|"专业"|"幽默"，识别不出时取"温暖"
function toTone(v: unknown): "温暖" | "专业" | "幽默" {
  const k = str(v).trim().toLowerCase()
  if (["温暖", "warm", "friendly"].includes(k)) return "温暖"
  if (["专业", "professional", "pro", "expert"].includes(k)) return "专业"
  if (["幽默", "humor", "humorous", "funny"].includes(k)) return "幽默"
  return "温暖"
}

function normalizePainPoint(raw: unknown): PainPointItem {
  if (typeof raw === "string") {
    return { point: raw, severity: "中", evidence: "" }
  }
  const rec = toRecord(raw)
  return {
    point: str(pick(rec, POINT_ALIASES)),
    severity: toSeverity(pick(rec, SEVERITY_ALIASES)),
    evidence: str(pick(rec, EVIDENCE_ALIASES)),
  }
}

function normalizeReply(raw: unknown): ReplyItem {
  if (typeof raw === "string") {
    return { tone: "温暖", target: "", content: raw }
  }
  const rec = toRecord(raw)
  return {
    tone: toTone(pick(rec, TONE_ALIASES)),
    target: str(pick(rec, TARGET_ALIASES)),
    content: str(pick(rec, REPLY_CONTENT_ALIASES)),
  }
}

export function normalizeCommentsResult(raw: unknown): CommentsResult {
  const rec = toRecord(raw)
  // 情感分布可能在 sentiment 包裹内，也可能平铺在顶层
  const sentiment = toRecord(pick(rec, SENTIMENT_ALIASES))
  const positive = int(pick(sentiment, POSITIVE_ALIASES) ?? pick(rec, POSITIVE_ALIASES))
  const neutral = int(pick(sentiment, NEUTRAL_ALIASES) ?? pick(rec, NEUTRAL_ALIASES))
  const negative = int(pick(sentiment, NEGATIVE_ALIASES) ?? pick(rec, NEGATIVE_ALIASES))
  const summary = str(pick(sentiment, SUMMARY_ALIASES) ?? pick(rec, SUMMARY_ALIASES))
  // 痛点/回复：超过 3 个截断、不足 3 个补空（满足 schema 的 length(3)）
  const painPoints = toList(pick(rec, PAINPOINTS_ALIASES), [
    ...POINT_ALIASES, ...SEVERITY_ALIASES, "证据", "原话",
  ]).map(normalizePainPoint).slice(0, 3)
  while (painPoints.length < 3) {
    painPoints.push({ point: "", severity: "中", evidence: "" })
  }
  const replies = toList(pick(rec, REPLIES_ALIASES), [
    ...TONE_ALIASES, ...TARGET_ALIASES, "话术",
  ]).map(normalizeReply).slice(0, 3)
  while (replies.length < 3) {
    replies.push({ tone: "温暖", target: "", content: "" })
  }
  return {
    sentiment: { positive, neutral, negative, summary },
    painPoints,
    replies,
  }
}
