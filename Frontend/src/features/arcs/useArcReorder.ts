import { onBeforeUnmount, ref } from "vue"
import { reorderIds } from "../../domain/reorder"

type ReorderFn = (ids: string[]) => void | Promise<void>

function idFromPoint(x: number, y: number, selector: string) {
  const hit = document.elementFromPoint(x, y)
  const node = hit?.closest(selector) as HTMLElement | null
  return node?.dataset.id ?? ""
}

/** 故事线列表拖拽排序。 */
export function useArcListReorder(orderedIds: () => string[], onCommit: ReorderFn) {
  const activeId = ref("")
  const overId = ref("")

  function stopTracking() {
    document.removeEventListener("pointermove", onDocumentMove)
    document.removeEventListener("pointerup", onDocumentUp)
    document.removeEventListener("pointercancel", onDocumentCancel)
  }

  function onDocumentMove(event: PointerEvent) {
    if (!activeId.value) return
    const id = idFromPoint(event.clientX, event.clientY, ".arc-lane[data-id]")
    if (id) overId.value = id
    event.preventDefault()
  }

  function onDocumentUp() {
    if (!activeId.value) {
      stopTracking()
      return
    }
    const ids = orderedIds()
    const from = ids.indexOf(activeId.value)
    const to = ids.indexOf(overId.value)
    const active = activeId.value
    activeId.value = ""
    overId.value = ""
    stopTracking()
    if (from < 0 || to < 0 || from === to) return
    void onCommit(reorderIds(ids, from, to))
  }

  function onDocumentCancel() {
    activeId.value = ""
    overId.value = ""
    stopTracking()
  }

  function beginDrag(id: string, event: PointerEvent) {
    if (event.button !== 0) return
    activeId.value = id
    overId.value = id
    document.addEventListener("pointermove", onDocumentMove)
    document.addEventListener("pointerup", onDocumentUp)
    document.addEventListener("pointercancel", onDocumentCancel)
    event.preventDefault()
  }

  onBeforeUnmount(() => stopTracking())

  return {
    activeId,
    beginDrag,
    isDragging: (id: string) => activeId.value === id,
    isOver: (id: string) => Boolean(activeId.value) && overId.value === id && activeId.value !== id,
  }
}

/** 故事线内事件芯片横向排序。 */
export function useArcChipReorder(
  arcId: string,
  orderedEventIds: () => string[],
  onCommit: (eventIds: string[]) => void | Promise<void>,
) {
  const activeEventId = ref("")
  const overEventId = ref("")

  function stopTracking() {
    document.removeEventListener("pointermove", onChipMove)
    document.removeEventListener("pointerup", onChipUp)
    document.removeEventListener("pointercancel", onChipCancel)
  }

  function onChipMove(event: PointerEvent) {
    if (!activeEventId.value) return
    const hit = document.elementFromPoint(event.clientX, event.clientY)
    const chip = hit?.closest(`.arc-chip[data-arc-id="${arcId}"]`) as HTMLElement | null
    const eventId = chip?.dataset.eventId ?? ""
    if (eventId) overEventId.value = eventId
    event.preventDefault()
  }

  function onChipUp() {
    if (!activeEventId.value) {
      stopTracking()
      return
    }
    const ids = orderedEventIds()
    const from = ids.indexOf(activeEventId.value)
    const to = ids.indexOf(overEventId.value)
    activeEventId.value = ""
    overEventId.value = ""
    stopTracking()
    if (from < 0 || to < 0 || from === to) return
    void onCommit(reorderIds(ids, from, to))
  }

  function onChipCancel() {
    activeEventId.value = ""
    overEventId.value = ""
    stopTracking()
  }

  function beginChipDrag(eventId: string, event: PointerEvent) {
    if (event.button !== 0) return
    activeEventId.value = eventId
    overEventId.value = eventId
    document.addEventListener("pointermove", onChipMove)
    document.addEventListener("pointerup", onChipUp)
    document.addEventListener("pointercancel", onChipCancel)
    event.preventDefault()
  }

  onBeforeUnmount(() => stopTracking())

  return {
    beginChipDrag,
    isChipDragging: (eventId: string) => activeEventId.value === eventId,
    isChipOver: (eventId: string) =>
      Boolean(activeEventId.value) && overEventId.value === eventId && activeEventId.value !== eventId,
  }
}