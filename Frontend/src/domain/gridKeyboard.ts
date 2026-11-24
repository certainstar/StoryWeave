const ARROW_KEYS = ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"] as const

/** 在栅格列表里用方向键切换选中项。 */
export function handleGridArrowKey(
  event: KeyboardEvent,
  ids: string[],
  currentId: string | undefined,
  columns: number,
  onPick: (id: string) => void,
): boolean {
  if (!ARROW_KEYS.includes(event.key as (typeof ARROW_KEYS)[number]) || !ids.length) return false
  const cols = Math.max(1, columns)
  let index = currentId ? ids.indexOf(currentId) : -1
  if (index < 0) index = 0

  let next = index
  switch (event.key) {
    case "ArrowUp":
      next = Math.max(0, index - cols)
      break
    case "ArrowDown":
      next = Math.min(ids.length - 1, index + cols)
      break
    case "ArrowLeft":
      next = index % cols > 0 ? index - 1 : index
      break
    case "ArrowRight":
      next = index % cols < cols - 1 && index + 1 < ids.length ? index + 1 : index
      break
  }

  if (next === index) return false
  onPick(ids[next])
  event.preventDefault()
  return true
}

/** 根据容器宽度估算栅格列数。 */
export function estimateGridColumns(container: HTMLElement, minWidth = 220, gap = 10) {
  return Math.max(1, Math.floor((container.clientWidth + gap) / (minWidth + gap)))
}

/** 单行/单列列表方向键（如横向场景轨）。 */
export function handleLinearArrowKey(
  event: KeyboardEvent,
  ids: string[],
  currentId: string | undefined,
  horizontal: boolean,
  onPick: (id: string) => void,
): boolean {
  const prev = horizontal ? "ArrowLeft" : "ArrowUp"
  const next = horizontal ? "ArrowRight" : "ArrowDown"
  if (event.key !== prev && event.key !== next) return false
  if (!ids.length) return false

  let index = currentId ? ids.indexOf(currentId) : -1
  if (index < 0) index = 0

  let target = index
  if (event.key === prev) target = Math.max(0, index - 1)
  else target = Math.min(ids.length - 1, index + 1)

  if (target === index) return false
  onPick(ids[target])
  event.preventDefault()
  return true
}