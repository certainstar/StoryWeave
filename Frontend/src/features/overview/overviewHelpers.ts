import type { Chapter } from "../../domain/types"

export interface OverviewStat {
  value: number
  label: string
}

/** 概览顶栏统计。 */
export function buildOverviewStats(input: {
  characters: number
  relations: number
  events: number
  chapters: Chapter[]
}): OverviewStat[] {
  const openChapters = input.chapters.filter((chapter) => chapter.status !== "完成").length
  return [
    { value: input.characters, label: "人物" },
    { value: input.relations, label: "关系" },
    { value: input.events, label: "事件" },
    { value: openChapters, label: "未完成章节" },
  ]
}

export interface OverviewShortcut {
  label: string
  hint: string
  count: number
}