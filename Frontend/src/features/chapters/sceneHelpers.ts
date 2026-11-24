import type { Scene } from "../../domain/types"

/** 某一章的场景，按 sortOrder。 */
export function scenesForChapter(scenes: Scene[], chapterId: string) {
  return scenes.filter((scene) => scene.chapterId === chapterId).sort((a, b) => a.sortOrder - b.sortOrder)
}