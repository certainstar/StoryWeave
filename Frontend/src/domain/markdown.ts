import { marked } from "marked"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
}

const unsafeLink = /^(javascript|data|vbscript):/i

marked.use({
  breaks: true,
  gfm: true,
  renderer: {
    html({ text }) {
      return escapeHtml(text)
    },
  },
  walkTokens(token) {
    if (token.type !== "link") return
    const href = "href" in token ? String(token.href) : ""
    if (unsafeLink.test(href)) token.href = "#"
  },
})

/**
 * 把章节原文转成预览 HTML。使用 `marked` 解析 Markdown。
 *
 * @param source - Markdown 原文。
 *
 * @returns 返回可插入页面的 HTML。空原文返回一句占位。
 */
export function renderMarkdown(source: string): string {
  const trimmed = source.trim()
  if (!trimmed) return "<p>这一章还没有正文。</p>"
  const html = marked.parse(trimmed, { async: false })
  return typeof html === "string" ? html : "<p>这一章还没有正文。</p>"
}