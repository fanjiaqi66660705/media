// 调用 Pexels API 检索免费可商用图片，服务端代理以保护 API key
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("query") ?? ""
  const perPage = "3"
  if (!query) return Response.json({ photos: [] })
  const key = process.env.PEXELS_API_KEY
  if (!key) {
    return Response.json(
      { photos: [], notice: "未配置 PEXELS_API_KEY，配图功能不可用" },
      { status: 200 },
    )
  }
  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${perPage}&locale=zh-CN`,
      {
        headers: { Authorization: key },
        next: { revalidate: 3600 },
      },
    )
    if (!res.ok)
      return Response.json(
        { photos: [], notice: `Pexels 请求失败 ${res.status}` },
        { status: 200 },
      )
    const data = await res.json()
    const photos = (data.photos ?? []).map(
      (p: {
        id: number
        photographer: string
        photographer_url: string
        src: { medium: string; large: string }
        alt: string
        url: string
      }) => ({
        id: p.id,
        thumb: p.src.medium,
        full: p.src.large,
        alt: p.alt,
        photographer: p.photographer,
        photographerUrl: p.photographer_url,
        link: p.url,
      }),
    )
    return Response.json({ photos })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "图片检索失败"
    return Response.json({ photos: [], error: msg }, { status: 200 })
  }
}
