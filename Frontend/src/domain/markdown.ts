/**
 * 把章节原文转成预览 HTML。只识别标题、列表和加粗。
 *
 * * `source` - Markdown 原文。
 *
 * 返回可插入页面的 HTML。空原文返回一句占位。
 */
export function renderMarkdown(source: string): string {
  const lines = escapeHtml(source).split("\n")
  let html = ""
  let inList = false
  const closeList = () => {
    if (inList) {
      html += "</ul>"
      inList = false
    }
  }
  const inline = (text: string) => text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
  for (const line of lines) {
    if (line.startsWith("### ")) {
      closeList()
      html += `<h3>${inline(line.slice(4))}</h3>`
    } else if (line.startsWith("## ")) {
      closeList()
      html += `<h2>${inline(line.slice(3))}</h2>`
    } else if (line.startsWith("- ")) {
      if (!inList) {
        html += "<ul>"
        inList = true
      }
      html += `<li>${inline(line.slice(2))}</li>`
    } else if (line.trim() === "") {
      closeList()
    } else {
      closeList()
      html += `<p>${inline(line)}</p>`
    }
  }
  closeList()
  return html || "<p>这一章还没有正文。</p>"
}

/**
 * 转义正文里的 HTML。
 *
 * * `value` - 作者输入。
 *
 * 返回可以放进 HTML 的文本。
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}
