import { onBeforeUnmount, ref } from "vue"
import { reorderIds } from "../../domain/reorder"

type ReorderFn = (ids: string[]) => void | Promise<void>

function idFromPoint(x: number, y: number) {
  const hit = document.elementFromPoint(x, y)
  const node = hit?.closest(".timeline-node[data-id]") as HTMLElement | null
  return node?.dataset.id ?? ""
}

/**
 * 时间线指针拖拽排序（列表级命中检测）。
 *
 * @param orderedIds - 当前 id 顺序。
 * @param onCommit - 落盘后回调。
 */
export function useTimelineReorder(orderedIds: () => string[], onCommit: ReorderFn) {
  const activeId = ref("")
  const overId = ref("")

  function indexOf(id: string, ids: string[]) {
    return ids.indexOf(id)
  }

  function clearDrag() {
    activeId.value = ""
    overId.value = ""
  }

  function stopTracking() {
    document.removeEventListener("pointermove", onDocumentMove)
    document.removeEventListener("pointerup", onDocumentUp)
    document.removeEventListener("pointercancel", onDocumentCancel)
  }

  function onDocumentMove(event: PointerEvent) {
    if (!activeId.value) return
    const id = idFromPoint(event.clientX, event.clientY)
    if (id) overId.value = id
    event.preventDefault()
  }

  function onDocumentUp() {
    if (!activeId.value) {
      stopTracking()
      return
    }
    const ids = orderedIds()
    const from = indexOf(activeId.value, ids)
    const to = indexOf(overId.value, ids)
    clearDrag()
    stopTracking()
    if (from < 0 || to < 0 || from === to) return
    void onCommit(reorderIds(ids, from, to))
  }

  function onDocumentCancel() {
    clearDrag()
    stopTracking()
  }

  function beginDrag(id: string, event: PointerEvent) {
    if (activeId.value) return
    activeId.value = id
    overId.value = id
    document.addEventListener("pointermove", onDocumentMove)
    document.addEventListener("pointerup", onDocumentUp)
    document.addEventListener("pointercancel", onDocumentCancel)
    event.preventDefault()
  }

  /** 左侧序号拖拽手柄。 */
  function onHandlePointerDown(id: string, event: PointerEvent) {
    if (event.button !== 0) return
    beginDrag(id, event)
  }

  /** 按住 Alt 在卡片上也可拖动。 */
  function onCardPointerDown(id: string, event: PointerEvent) {
    if (event.button !== 0 || !event.altKey) return
    const target = event.target as HTMLElement
    if (target.closest(".toolbar-icons, button, a, input, textarea, select")) return
    beginDrag(id, event)
  }

  onBeforeUnmount(() => stopTracking())

  function isDragging(id: string) {
    return activeId.value === id
  }

  function isOver(id: string) {
    return Boolean(activeId.value) && overId.value === id && activeId.value !== id
  }

  return {
    activeId,
    onHandlePointerDown,
    onCardPointerDown,
    isDragging,
    isOver,
  }
}