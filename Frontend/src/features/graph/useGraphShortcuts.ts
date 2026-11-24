import { onMounted, onUnmounted } from "vue"
import { useRoute } from "vue-router"

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return Boolean(target.closest(".cm-editor, .draft-sheet"))
}

/** 关系图视图：按 `f` 适应画布（非输入时）。 */
export function useGraphFitShortcut(fit: () => void) {
  const route = useRoute()

  function onKey(event: KeyboardEvent) {
    if (String(route.name) !== "graph") return
    if (event.key !== "f" || event.altKey || event.ctrlKey || event.metaKey) return
    if (isTypingTarget(event.target)) return
    fit()
    event.preventDefault()
  }

  onMounted(() => document.addEventListener("keydown", onKey))
  onUnmounted(() => document.removeEventListener("keydown", onKey))
}