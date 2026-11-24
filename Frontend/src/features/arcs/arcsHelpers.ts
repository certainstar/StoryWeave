import type { StoryArc, StoryEvent } from "../../domain/types"

/** 故事线按叙述优先级排序。 */
export function sortArcs(arcs: StoryArc[]) {
  return [...arcs].sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "zh"))
}

/** 事件标题，故事线芯片用。 */
export function eventTitle(eventId: string, events: StoryEvent[]) {
  return events.find((event) => event.id === eventId)?.title || "未命名事件"
}