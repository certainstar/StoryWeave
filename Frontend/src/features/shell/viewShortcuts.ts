import type { ViewId } from "../../domain/types"

const ALT_VIEWS: Record<string, ViewId> = {
  "1": "overview",
  "2": "characters",
  "3": "graph",
  "4": "arcs",
  "5": "timeline",
  "6": "chapters",
  "7": "notes",
  "8": "reader",
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return Boolean(target.closest(".cm-editor"))
}

/** Alt+1…8 切换工作台视图（输入框内不触发）。 */
export function handleViewShortcut(event: KeyboardEvent, onView: (id: ViewId) => void): boolean {
  if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
  if (isTypingTarget(event.target)) return false
  const view = ALT_VIEWS[event.key]
  if (!view) return false
  onView(view)
  event.preventDefault()
  return true
}

export function viewShortcutLabel(index: string) {
  const digit = Number.parseInt(index, 10)
  return Number.isFinite(digit) ? `Alt+${digit}` : ""
}