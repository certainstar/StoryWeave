import {
  ARC_KINDS,
  CHAPTER_STATUS,
  CHARACTER_STATUS,
  RELATION_SPANS,
  RELATION_TYPES,
  type Chapter,
  type Character,
  type GraphLayout,
  type Note,
  type ProjectSummary,
  type Relation,
  type Scene,
  type Snapshot,
  type StoryArc,
  type StoryEvent,
} from "../domain/types"
import { ApiError, notFound, validation } from "./errors"
import type { StoryRepository } from "./story"

const STORAGE_KEY = "storyweave.memory"

interface SnapshotBody {
  characters: Character[]
  relations: Relation[]
  events: StoryEvent[]
  arcs: StoryArc[]
  chapters: Chapter[]
  scenes: Scene[]
  notes: Note[]
  layout: GraphLayout
  summary: Pick<ProjectSummary, "name" | "description">
}

interface StoredProject {
  summary: ProjectSummary
  characters: Character[]
  relations: Relation[]
  events: StoryEvent[]
  arcs: StoryArc[]
  chapters: Chapter[]
  scenes: Scene[]
  notes: Note[]
  layout: GraphLayout
  snapshots: Array<{ snapshotAt: string; body: SnapshotBody }>
}

interface MemoryFile {
  theme: string
  clean: boolean
  recoverySkip: string
  sessionRead: boolean
  projects: StoredProject[]
}

/**
 * 浏览器里预览用的仓库。规则和桌面版命令一致，数据留在 localStorage。
 *
 * 返回与 `StoryRepository` 相同的方法。失败时抛出同样的错误码。
 */
export function createMemoryRepository(): StoryRepository {
  const file = load()
  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
  window.addEventListener("pagehide", () => {
    file.clean = true
    persist()
  })

  const project = (id: string) => {
    const found = file.projects.find((item) => item.summary.id === id)
    if (!found) throw notFound()
    return found
  }
  const touch = (item: StoredProject) => {
    const stamp = now()
    item.summary.updatedAt = stamp
    item.summary.lastOpenedAt = stamp
    file.projects.sort((a, b) => b.summary.lastOpenedAt.localeCompare(a.summary.lastOpenedAt))
    persist()
    return stamp
  }
  const requireText = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) throw validation("EMPTY_NAME", "名称不能为空")
    return trimmed
  }
  const oneOf = (value: string, allowed: readonly string[], reason: string, message: string) => {
    if (!allowed.includes(value)) throw validation(reason, message)
  }

  return {
    async appGetState() {
      const previous = file.sessionRead ? true : file.clean
      if (!file.sessionRead) {
        file.clean = false
        file.sessionRead = true
        persist()
      }
      const recent = [...file.projects].sort((a, b) => b.summary.lastOpenedAt.localeCompare(a.summary.lastOpenedAt)).map((item) => item.summary)
      const first = recent[0]
      const snapshot = first ? project(first.id).snapshots[0] : undefined
      const token = first && snapshot ? `${first.id}:${snapshot.snapshotAt}` : ""
      const recovery = !previous && snapshot && token !== file.recoverySkip
        ? { needed: true, projectId: first.id, snapshotAt: snapshot.snapshotAt }
        : { needed: false, projectId: null, snapshotAt: null }
      return { theme: file.theme, recent, recovery }
    },
    async appSetTheme(theme) {
      oneOf(theme, ["paper", "ink"], "UNKNOWN_STATUS", "选择宣纸或夜墨。")
      file.theme = theme
      persist()
      return theme
    },
    async appDismissRecovery(projectId, snapshotAt) {
      file.recoverySkip = `${projectId}:${snapshotAt}`
      persist()
    },
    async pluginList() {
      return [{ id: "sample", name: "示例插槽" }]
    },
    async projectList() {
      return [...file.projects].map((item) => item.summary).sort((a, b) => b.lastOpenedAt.localeCompare(a.lastOpenedAt))
    },
    async projectCreate(name, description) {
      const title = requireText(name)
      const stamp = now()
      const id = uid()
      const summary: ProjectSummary = {
        id,
        name: title,
        description: description.trim(),
        path: `memory://${id}.sqlite`,
        updatedAt: stamp,
        lastOpenedAt: stamp,
      }
      file.projects.unshift(emptyProject(summary))
      persist()
      return summary
    },
    async projectOpen(id) {
      const item = project(id)
      item.summary.lastOpenedAt = now()
      persist()
      return item.summary
    },
    async projectUpdate(id, name, description) {
      const item = project(id)
      item.summary.name = requireText(name)
      item.summary.description = description.trim()
      touch(item)
      return item.summary
    },
    async projectClose() {
      return undefined
    },
    async characterList(projectId) {
      return project(projectId).characters
    },
    async characterCreate(projectId, name) {
      const item = project(projectId)
      const stamp = now()
      const character: Character = {
        id: uid(),
        name: requireText(name),
        aliases: [],
        role: "",
        appearance: "",
        personality: "",
        goal: "",
        background: "",
        notes: "",
        status: "在场",
        createdAt: stamp,
        updatedAt: stamp,
      }
      item.characters.push(character)
      touch(item)
      return character
    },
    async characterUpdate(projectId, character) {
      const item = project(projectId)
      const index = item.characters.findIndex((entry) => entry.id === character.id)
      if (index < 0) throw notFound()
      oneOf(character.status, CHARACTER_STATUS, "UNKNOWN_STATUS", "选择一种状态")
      const next = { ...character, name: requireText(character.name), updatedAt: now() }
      item.characters[index] = next
      touch(item)
      return next
    },
    async characterDelete(projectId, id) {
      const item = project(projectId)
      const before = item.characters.length
      item.characters = item.characters.filter((entry) => entry.id !== id)
      if (item.characters.length === before) throw notFound()
      item.relations = item.relations.filter((relation) => relation.sourceId !== id && relation.targetId !== id)
      for (const event of item.events) {
        event.participants = event.participants.filter((person) => person.characterId !== id)
      }
      for (const chapter of item.chapters) {
        chapter.characterIds = chapter.characterIds.filter((characterId) => characterId !== id)
      }
      touch(item)
    },
    async relationList(projectId) {
      return project(projectId).relations
    },
    async relationCreate(projectId, relation) {
      const item = project(projectId)
      assertRelation(item, relation.sourceId, relation.targetId, relation.type, relation.span)
      const stamp = now()
      const created: Relation = { ...relation, id: uid(), createdAt: stamp, updatedAt: stamp }
      item.relations.push(created)
      touch(item)
      return created
    },
    async relationUpdate(projectId, relation) {
      const item = project(projectId)
      const index = item.relations.findIndex((entry) => entry.id === relation.id)
      if (index < 0) throw notFound()
      assertRelation(item, relation.sourceId, relation.targetId, relation.type, relation.span)
      const next = { ...relation, updatedAt: now() }
      item.relations[index] = next
      touch(item)
      return next
    },
    async relationDelete(projectId, id) {
      const item = project(projectId)
      const before = item.relations.length
      item.relations = item.relations.filter((entry) => entry.id !== id)
      if (item.relations.length === before) throw notFound()
      touch(item)
    },
    async graphLayoutGet(projectId) {
      return project(projectId).layout
    },
    async graphLayoutSave(projectId, viewport, nodes) {
      const item = project(projectId)
      item.layout = {
        viewport,
        nodes: { ...item.layout.nodes, ...nodes },
        updatedAt: now(),
      }
      touch(item)
      return item.layout
    },
    async eventList(projectId) {
      return [...project(projectId).events].sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async eventCreate(projectId, title) {
      const item = project(projectId)
      const stamp = now()
      const event: StoryEvent = {
        id: uid(),
        title: requireText(title),
        description: "",
        storyTime: null,
        sortOrder: nextSort(item.events),
        participants: [],
        createdAt: stamp,
        updatedAt: stamp,
      }
      item.events.push(event)
      touch(item)
      return event
    },
    async eventUpdate(projectId, event) {
      const item = project(projectId)
      const index = item.events.findIndex((entry) => entry.id === event.id)
      if (index < 0) throw notFound()
      for (const person of event.participants) {
        if (!item.characters.some((character) => character.id === person.characterId)) throw notFound()
      }
      const next = { ...event, title: requireText(event.title), storyTime: event.storyTime?.trim() ? event.storyTime : null, updatedAt: now() }
      item.events[index] = next
      touch(item)
      return next
    },
    async eventDelete(projectId, id) {
      const item = project(projectId)
      const before = item.events.length
      item.events = item.events.filter((entry) => entry.id !== id)
      if (item.events.length === before) throw notFound()
      for (const arc of item.arcs) arc.eventIds = arc.eventIds.filter((eventId) => eventId !== id)
      for (const chapter of item.chapters) chapter.eventIds = chapter.eventIds.filter((eventId) => eventId !== id)
      touch(item)
    },
    async eventReorder(projectId, ids) {
      const item = project(projectId)
      permute(item.events.map((event) => event.id), ids)
      ids.forEach((id, index) => {
        const event = item.events.find((entry) => entry.id === id)
        if (event) event.sortOrder = index + 1
      })
      touch(item)
      return [...item.events].sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async arcList(projectId) {
      return project(projectId).arcs
    },
    async arcCreate(projectId, title, kind = "支线") {
      const item = project(projectId)
      oneOf(kind, ARC_KINDS, "UNKNOWN_KIND", "选择一种故事线")
      const stamp = now()
      const arc: StoryArc = {
        id: uid(),
        title: requireText(title),
        kind,
        summary: "",
        sortOrder: nextSort(item.arcs),
        eventIds: [],
        createdAt: stamp,
        updatedAt: stamp,
      }
      item.arcs.push(arc)
      touch(item)
      return arc
    },
    async arcUpdate(projectId, arc) {
      const item = project(projectId)
      const index = item.arcs.findIndex((entry) => entry.id === arc.id)
      if (index < 0) throw notFound()
      oneOf(arc.kind, ARC_KINDS, "UNKNOWN_KIND", "选择一种故事线")
      const next = { ...item.arcs[index], title: requireText(arc.title), kind: arc.kind, summary: arc.summary, updatedAt: now() }
      item.arcs[index] = next
      touch(item)
      return next
    },
    async arcDelete(projectId, id) {
      const item = project(projectId)
      const before = item.arcs.length
      item.arcs = item.arcs.filter((entry) => entry.id !== id)
      if (item.arcs.length === before) throw notFound()
      touch(item)
    },
    async arcSetEvents(projectId, id, eventIds) {
      const item = project(projectId)
      const arc = item.arcs.find((entry) => entry.id === id)
      if (!arc) throw notFound()
      if (new Set(eventIds).size !== eventIds.length) throw validation("DUPLICATE_LINK", "已经在里面了")
      for (const eventId of eventIds) {
        if (!item.events.some((event) => event.id === eventId)) throw notFound()
      }
      arc.eventIds = [...eventIds]
      arc.updatedAt = now()
      touch(item)
      return arc
    },
    async chapterList(projectId) {
      return [...project(projectId).chapters].sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async chapterCreate(projectId, title) {
      const item = project(projectId)
      const stamp = now()
      const chapter: Chapter = {
        id: uid(),
        title: requireText(title),
        status: "构思中",
        summary: "",
        content: "",
        sortOrder: nextSort(item.chapters),
        characterIds: [],
        eventIds: [],
        createdAt: stamp,
        updatedAt: stamp,
      }
      item.chapters.push(chapter)
      touch(item)
      return chapter
    },
    async chapterUpdate(projectId, chapter) {
      const item = project(projectId)
      const index = item.chapters.findIndex((entry) => entry.id === chapter.id)
      if (index < 0) throw notFound()
      oneOf(chapter.status, CHAPTER_STATUS, "UNKNOWN_STATUS", "选择一种状态")
      if (new Set(chapter.characterIds).size !== chapter.characterIds.length) throw validation("DUPLICATE_LINK", "已经在里面了")
      if (new Set(chapter.eventIds).size !== chapter.eventIds.length) throw validation("DUPLICATE_LINK", "已经在里面了")
      const next = { ...chapter, title: requireText(chapter.title), updatedAt: now() }
      item.chapters[index] = next
      touch(item)
      return next
    },
    async chapterDelete(projectId, id) {
      const item = project(projectId)
      const before = item.chapters.length
      item.chapters = item.chapters.filter((entry) => entry.id !== id)
      if (item.chapters.length === before) throw notFound()
      item.scenes = item.scenes.filter((scene) => scene.chapterId !== id)
      touch(item)
    },
    async chapterReorder(projectId, ids) {
      const item = project(projectId)
      permute(item.chapters.map((chapter) => chapter.id), ids)
      ids.forEach((id, index) => {
        const chapter = item.chapters.find((entry) => entry.id === id)
        if (chapter) chapter.sortOrder = index + 1
      })
      touch(item)
      return [...item.chapters].sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async sceneList(projectId, chapterId) {
      const item = project(projectId)
      if (!item.chapters.some((chapter) => chapter.id === chapterId)) throw notFound()
      return item.scenes.filter((scene) => scene.chapterId === chapterId).sort((a, b) => a.sortOrder - b.sortOrder)
    },
    async sceneCreate(projectId, chapterId, title) {
      const item = project(projectId)
      if (!item.chapters.some((chapter) => chapter.id === chapterId)) throw notFound()
      const stamp = now()
      const scene: Scene = {
        id: uid(),
        chapterId,
        title: requireText(title),
        summary: "",
        storyTime: null,
        sortOrder: nextSort(item.scenes.filter((entry) => entry.chapterId === chapterId)),
        createdAt: stamp,
        updatedAt: stamp,
      }
      item.scenes.push(scene)
      touch(item)
      return scene
    },
    async sceneUpdate(projectId, scene) {
      const item = project(projectId)
      const index = item.scenes.findIndex((entry) => entry.id === scene.id)
      if (index < 0) throw notFound()
      const next = { ...scene, title: requireText(scene.title), storyTime: scene.storyTime?.trim() ? scene.storyTime : null, updatedAt: now() }
      item.scenes[index] = next
      touch(item)
      return next
    },
    async sceneDelete(projectId, id) {
      const item = project(projectId)
      const before = item.scenes.length
      item.scenes = item.scenes.filter((entry) => entry.id !== id)
      if (item.scenes.length === before) throw notFound()
      touch(item)
    },
    async noteList(projectId) {
      return project(projectId).notes
    },
    async noteCreate(projectId, title) {
      const item = project(projectId)
      const stamp = now()
      const note: Note = { id: uid(), title: requireText(title), content: "", tags: [], createdAt: stamp, updatedAt: stamp }
      item.notes.unshift(note)
      touch(item)
      return note
    },
    async noteUpdate(projectId, note) {
      const item = project(projectId)
      const index = item.notes.findIndex((entry) => entry.id === note.id)
      if (index < 0) throw notFound()
      const next = { ...note, title: requireText(note.title), updatedAt: now() }
      item.notes[index] = next
      touch(item)
      return next
    },
    async noteDelete(projectId, id) {
      const item = project(projectId)
      const before = item.notes.length
      item.notes = item.notes.filter((entry) => entry.id !== id)
      if (item.notes.length === before) throw notFound()
      touch(item)
    },
    async search(projectId, query) {
      const needle = query.trim().toLowerCase()
      if (!needle) return []
      const item = project(projectId)
      const hits = [
        ...item.characters.filter((entry) => `${entry.name} ${entry.aliases.join(" ")}`.toLowerCase().includes(needle)).map((entry) => ({ kind: "character", id: entry.id, title: entry.name })),
        ...item.events.filter((entry) => `${entry.title} ${entry.description} ${entry.storyTime ?? ""}`.toLowerCase().includes(needle)).map((entry) => ({ kind: "event", id: entry.id, title: entry.title })),
        ...item.arcs.filter((entry) => `${entry.title} ${entry.summary}`.toLowerCase().includes(needle)).map((entry) => ({ kind: "arc", id: entry.id, title: entry.title })),
        ...item.chapters.filter((entry) => `${entry.title} ${entry.summary} ${entry.content}`.toLowerCase().includes(needle)).map((entry) => ({ kind: "chapter", id: entry.id, title: entry.title })),
        ...item.notes.filter((entry) => `${entry.title} ${entry.content} ${entry.tags.join(" ")}`.toLowerCase().includes(needle)).map((entry) => ({ kind: "note", id: entry.id, title: entry.title })),
      ]
      return hits
    },
    async backupCreate(projectId) {
      const item = project(projectId)
      const snapshotAt = now().replace(/[-:]/g, "")
      item.snapshots.unshift({ snapshotAt, body: bodyOf(item) })
      item.snapshots = item.snapshots.slice(0, 10)
      persist()
      return { snapshotAt, path: `memory://backups/${projectId}/${snapshotAt}.sqlite` }
    },
    async backupList(projectId) {
      return project(projectId).snapshots.map((snapshot) => ({
        snapshotAt: snapshot.snapshotAt,
        path: `memory://backups/${projectId}/${snapshot.snapshotAt}.sqlite`,
      }))
    },
    async backupRestore(projectId, snapshotAt) {
      const item = project(projectId)
      const snapshot = item.snapshots.find((entry) => entry.snapshotAt === snapshotAt)
      if (!snapshot) throw new ApiError("BACKUP_ERROR", "恢复没有执行。")
      const safety: Snapshot["snapshotAt"] = `before-${now().replace(/[-:]/g, "")}`
      item.snapshots.unshift({ snapshotAt: safety, body: bodyOf(item) })
      applyBody(item, snapshot.body)
      item.snapshots = item.snapshots.slice(0, 10)
      touch(item)
      return item.summary
    },
  }

  function assertRelation(item: StoredProject, sourceId: string, targetId: string, type: string, span: string) {
    if (sourceId === targetId) throw validation("SELF_RELATION", "不能把人物连向自己")
    if (!item.characters.some((character) => character.id === sourceId)) throw notFound()
    if (!item.characters.some((character) => character.id === targetId)) throw notFound()
    oneOf(type, RELATION_TYPES, "UNKNOWN_TYPE", "选择一种关系类型")
    oneOf(span, RELATION_SPANS, "UNKNOWN_STATUS", "选择一种关系区间")
  }
}

function emptyProject(summary: ProjectSummary): StoredProject {
  return {
    summary,
    characters: [],
    relations: [],
    events: [],
    arcs: [],
    chapters: [],
    scenes: [],
    notes: [],
    layout: { viewport: { x: 0, y: 0, zoom: 1 }, nodes: {}, updatedAt: summary.updatedAt },
    snapshots: [],
  }
}

function bodyOf(item: StoredProject): SnapshotBody {
  return {
    characters: structuredClone(item.characters),
    relations: structuredClone(item.relations),
    events: structuredClone(item.events),
    arcs: structuredClone(item.arcs),
    chapters: structuredClone(item.chapters),
    scenes: structuredClone(item.scenes),
    notes: structuredClone(item.notes),
    layout: structuredClone(item.layout),
    summary: { name: item.summary.name, description: item.summary.description },
  }
}

function applyBody(item: StoredProject, body: SnapshotBody) {
  item.characters = body.characters
  item.relations = body.relations
  item.events = body.events
  item.arcs = body.arcs
  item.chapters = body.chapters
  item.scenes = body.scenes
  item.notes = body.notes
  item.layout = body.layout
  item.summary.name = body.summary.name
  item.summary.description = body.summary.description
}

function permute(existing: string[], ids: string[]) {
  const same = existing.length === ids.length && existing.every((id) => ids.includes(id)) && new Set(ids).size === ids.length
  if (!same) throw validation("DUPLICATE_LINK", "顺序需要包含全部条目，且不能重复。")
}

function nextSort(list: Array<{ sortOrder: number }>) {
  return list.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1
}

function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
}

function uid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase()
}

function load(): MemoryFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh()
    const parsed = JSON.parse(raw) as MemoryFile
    parsed.sessionRead = false
    return parsed
  } catch {
    return fresh()
  }
}

function fresh(): MemoryFile {
  return { theme: "paper", clean: true, recoverySkip: "", sessionRead: false, projects: [] }
}
