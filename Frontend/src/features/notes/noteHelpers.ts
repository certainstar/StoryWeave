import type { Note } from "../../domain/types"

/** 按 sortOrder 排序。 */
export function sortNotes(notes: Note[]) {
  return [...notes].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "zh"))
}

export function formatNoteTags(tags: string[]) {
  return tags.join("、") || "无标签"
}

/** 列表摘要去掉首尾空白。 */
export function notePreview(content: string, max = 160) {
  const text = content.replace(/\s+/g, " ").trim()
  if (!text) return "还没有正文。"
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}