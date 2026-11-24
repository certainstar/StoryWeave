import type { Character, Note, StoryArc, StoryEvent } from "../../../domain/types"
import type { useWorkspace } from "../../../stores/workspace"

type Store = ReturnType<typeof useWorkspace>

/** 把别名输入拆成列表并自动保存。 */
export function applyAliases(value: string, person: Character, store: Store) {
  person.aliases = value.split(/[、,，]/).map((item) => item.trim()).filter(Boolean)
  store.scheduleCharacter(person.id)
}

/** 把标签输入拆成列表并自动保存。 */
export function applyTags(value: string, item: Note, store: Store) {
  item.tags = value.split(/[、,，]/).map((part) => part.trim()).filter(Boolean)
  store.scheduleNote(item.id)
}

/** 切换多选 id 列表。 */
export function toggleId(list: string[], id: string, checked: boolean) {
  return checked ? [...list, id] : list.filter((item) => item !== id)
}

/** 切换事件参与者。 */
export function toggleParticipant(store: Store, item: StoryEvent, id: string, checked: boolean) {
  item.participants = checked
    ? [...item.participants, { characterId: id, role: "" }]
    : item.participants.filter((person) => person.characterId !== id)
  store.scheduleEvent(item.id)
}

export function nameOf(store: Store, id: string) {
  return store.characters.find((item) => item.id === id)?.name || "未命名人物"
}

export function eventTitle(store: Store, id: string) {
  return store.events.find((item) => item.id === id)?.title || "未命名事件"
}

export function relationsOf(store: Store, id: string) {
  return store.relations.filter((entry) => entry.sourceId === id || entry.targetId === id)
}

export function eventsNotIn(store: Store, ids: string[]) {
  return store.events.filter((entry) => !ids.includes(entry.id))
}

/** 在故事线里挪动事件顺序。 */
export async function moveArcEvent(store: Store, item: StoryArc, eventId: string, delta: number) {
  const ids = [...item.eventIds]
  const index = ids.indexOf(eventId)
  const next = index + delta
  if (index < 0 || next < 0 || next >= ids.length) return
  const [moved] = ids.splice(index, 1)
  ids.splice(next, 0, moved)
  await store.setArcEvents(item.id, ids)
}

export async function addArcEvent(store: Store, item: StoryArc, eventId: string) {
  if (!eventId) return
  await store.setArcEvents(item.id, [...item.eventIds, eventId])
}