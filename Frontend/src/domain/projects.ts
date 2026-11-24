import type { ProjectSummary } from "./types"

/**
 * 最近项目按名称去重，保留最近打开的一条。
 *
 * @param items - 应用库返回的最近列表。
 */
export function dedupeRecentByName(items: ProjectSummary[]): ProjectSummary[] {
  const byName = new Map<string, ProjectSummary>()
  for (const item of items) {
    const key = item.name.trim() || item.id
    const prev = byName.get(key)
    if (!prev || item.lastOpenedAt.localeCompare(prev.lastOpenedAt) > 0) {
      byName.set(key, item)
    }
  }
  return [...byName.values()].sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
}