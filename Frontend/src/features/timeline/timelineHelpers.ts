import type { Chapter, Character, StoryEvent } from "../../domain/types"

/** 参与者姓名，以顿号连接。 */
export function formatEventPeople(characterIds: string[], characters: Character[]) {
  const names = characterIds
    .map((id) => characters.find((character) => character.id === id)?.name)
    .filter(Boolean)
  return names.join("、") || "没有参与者"
}

/** 事件首次被写入的章节。 */
export function firstChapterForEvent(eventId: string, chapters: Chapter[]) {
  return [...chapters]
    .filter((chapter) => chapter.eventIds.includes(eventId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, "zh"))[0]
}

/** 叙述落点摘要。 */
export function formatNarrativeAnchor(chapter: Chapter | undefined) {
  if (!chapter) return "尚未写入章节"
  return `首次叙述于第 ${chapter.sortOrder} 章 ${chapter.title}`
}

export type TimelineRow = StoryEvent & { index: number }