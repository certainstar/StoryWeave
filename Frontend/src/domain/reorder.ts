/**
 * 按索引移动一项，返回新的 id 顺序。
 *
 * @param ids - 当前顺序。
 * @param from - 被拖动的下标。
 * @param to - 目标下标。
 */
export function reorderIds(ids: string[], from: number, to: number): string[] {
  if (from === to || from < 0 || to < 0 || from >= ids.length || to >= ids.length) return ids
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
