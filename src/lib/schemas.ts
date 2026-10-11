import { z } from "zod"

// 模块一：选题标题生成 - 结构化输出 schema
export const topicResultSchema = z.object({
  directions: z
    .array(
      z.object({
        direction: z.string().describe("选题方向标题"),
        angle: z.string().describe("切入点，一句话说明为什么这个选题能吸引目标受众"),
        clickRateReason: z.string().describe("预估点击率理由"),
        titles: z.object({
          suspense: z.string().describe("悬念式标题"),
          resonance: z.string().describe("共鸣式标题"),
          number: z.string().describe("数字式标题"),
          contrast: z.string().describe("反差式标题"),
          question: z.string().describe("疑问式标题"),
        }),
      }),
    )
    .min(3)
    .describe("3-5 个选题方向"),
})

export type TopicResult = z.infer<typeof topicResultSchema>

// 模块二：智能排版配图 - 结构化输出 schema
export const typesetResultSchema = z.object({
  title: z.string().describe("为这篇文章起的公众号标题"),
  intro: z.object({
    content: z.string().describe("引言正文，吸引阅读的开头，2-3 句"),
    imageKeywords: z
      .array(z.string())
      .min(2)
      .max(3)
      .describe("2-3 个配图检索关键词（英文或中文）"),
  }),
  arguments: z
    .array(
      z.object({
        subtitle: z.string().describe("分论点小标题"),
        content: z.string().describe("分论点正文，3-5 句"),
        imageKeywords: z
          .array(z.string())
          .min(2)
          .max(3)
          .describe("2-3 个配图检索关键词"),
      }),
    )
    .min(2)
    .max(4)
    .describe("2-4 个分论点"),
  highlights: z
    .array(z.string())
    .min(1)
    .max(2)
    .describe("1-2 句可加粗传播的金句"),
  ending: z.object({
    content: z.string().describe("结尾正文，含互动引导，2-3 句"),
    imageKeywords: z
      .array(z.string())
      .min(2)
      .max(3)
      .describe("2-3 个配图检索关键词"),
  }),
})

export type TypesetResult = z.infer<typeof typesetResultSchema>

// 模块三：评论互动复盘 - 结构化输出 schema
export const commentsResultSchema = z.object({
  sentiment: z.object({
    positive: z.number().int().min(0).describe("正面评论条数"),
    neutral: z.number().int().min(0).describe("中性评论条数"),
    negative: z.number().int().min(0).describe("负面评论条数"),
    summary: z.string().describe("整体情感态势一句话总结"),
  }),
  painPoints: z
    .array(
      z.object({
        point: z.string().describe("痛点描述"),
        severity: z.enum(["高", "中", "低"]).describe("严重程度"),
        evidence: z.string().describe("来自评论的证据/原话摘要"),
      }),
    )
    .min(1)
    .describe("1-3 个粉丝最关心的痛点"),
  replies: z
    .array(
      z.object({
        tone: z.enum(["温暖", "专业", "幽默"]).describe("回复基调"),
        target: z.string().describe("针对的痛点或评论场景"),
        content: z.string().describe("回复话术全文"),
      }),
    )
    .min(1)
    .describe("1-3 条高情商官方回复"),
})

export type CommentsResult = z.infer<typeof commentsResultSchema>
