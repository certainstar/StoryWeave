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

/** session存储键。 */
const STORAGE_KEY = "storyweave.memory"

/** 快照内容。 */
interface SnapshotBody {
  characters: Character[]  // 人物列表
  relations: Relation[]  // 关系列表
  events: StoryEvent[]  // 事件列表
  arcs: StoryArc[]  // 故事线列表
  chapters: Chapter[]  // 章节列表
  scenes: Scene[]  // 场景列表
  notes: Note[]  // 笔记列表
  layout: GraphLayout  // 图谱布局
  summary: Pick<ProjectSummary, "name" | "description">  // 项目摘要
}

/** 存储项目。 */
interface StoredProject {
  summary: ProjectSummary  // 项目摘要
  characters: Character[]  // 人物列表
  relations: Relation[]  // 关系列表
  events: StoryEvent[]  // 事件列表
  arcs: StoryArc[]  // 故事线列表
  chapters: Chapter[]  // 章节列表
  scenes: Scene[]  // 场景列表
  notes: Note[]  // 笔记列表
  layout: GraphLayout  // 图谱布局
  snapshots: Array<{ snapshotAt: string; body: SnapshotBody }>  // 快照列表
}

/** 存储文件。 */
interface MemoryFile {
  theme: string  // 主题
  clean: boolean  // 表示当前页面即将隐藏或离开当前页面
  recoverySkip: string  // 恢复跳过令牌
  sessionRead: boolean  // 标记session是否已读取
  projects: StoredProject[]  // 项目列表
}

/**
 * 浏览器里预览用的仓库。规则和桌面版命令一致，数据留在 localStorage。
 * 
 * @returns 返回与 `StoryRepository` 相同的方法。失败时抛出同样的错误码。
 */
export function createMemoryRepository(): StoryRepository {
  const file = load() // 加载存储文件
  /** 持久化存储文件。 */
  const persist = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(file)) 
  window.addEventListener("pagehide", () => {  // 监听页面隐藏事件，设置为已隐藏
    file.clean = true
    persist()
  })

  /** 根据项目ID获取项目。 */
  const project = (id: string) => {
    const found = file.projects.find((item) => item.summary.id === id)
    if (!found) throw notFound()  // 如果找不到则抛出错误
    return found
  }
  /** 更新项目的时间戳。 */
  const touch = (item: StoredProject) => {
    const stamp = now()
    item.summary.updatedAt = stamp
    item.summary.lastOpenedAt = stamp
    file.projects.sort((a, b) => b.summary.lastOpenedAt.localeCompare(a.summary.lastOpenedAt))  // 按最后打开时间排序
    persist()
    return stamp
  }
  /** 确保文本不为空。 */
  const requireText = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) throw validation("EMPTY_NAME", "名称不能为空~")
    return trimmed
  }
  /** 确保值在允许的列表中。 */
  const oneOf = (value: string, allowed: readonly string[], reason: string, message: string) => {
    if (!allowed.includes(value)) throw validation(reason, message)
  }

  return {
    async appGetState() {
      const previous = file.sessionRead ? true : file.clean  // 如果session未读取，则上次状态取决于clean状态
      if (!file.sessionRead) {  // 如果session未读取，且进入本方法则认为又回到页面
        file.clean = false
        file.sessionRead = true
        persist()  // 持久化存储文件
      }
      const recent = [...file.projects].sort((a, b) => b.summary.lastOpenedAt.localeCompare(a.summary.lastOpenedAt)).map((item) => item.summary)  // 按最后打开时间排序
      const first = recent[0]
      const snapshot = first ? project(first.id).snapshots[0] : undefined  // 获取第一个项目的第一个快照，如果找不到则返回 undefined
      const token = first && snapshot ? `${first.id}:${snapshot.snapshotAt}` : ""  // 如果第一个项目存在且有快照，则生成一个令牌
      const recovery = !previous && snapshot && token !== file.recoverySkip  // 如果上次退出不完整且有快照且令牌不等于恢复跳过令牌，则需要恢复
        ? { needed: true, projectId: first.id, snapshotAt: snapshot.snapshotAt }
        : { needed: false, projectId: null, snapshotAt: null }
      return { 
        theme: file.theme, 
        recent, 
        recovery,
      }
    },
    async appSetTheme(theme) {
      oneOf(theme, ["paper", "ink"], "UNKNOWN_STATUS", "当前主题仅支持宣纸和夜墨～")  // 确保主题在允许的列表中
      file.theme = theme
      persist()
      return theme
    },
    async appDismissRecovery(projectId, snapshotAt) {
      file.recoverySkip = `${projectId}:${snapshotAt}`  // 设置恢复跳过令牌
      persist()
    },
    async pluginList() {
      // TODO 实现读取已注册的进程内插件，当前只返回示例插槽。
      return [{ id: "sample", name: "示例插槽" }]  // 返回示例插槽，用于演示插件功能
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
      file.projects.unshift(emptyProject(summary))  // 创建一个空项目，并添加到项目列表最前面
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
    async projectClose(id) {
      // 网页版没有关闭项目库的功能，所以返回 undefined
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
      oneOf(character.status, CHARACTER_STATUS, "UNKNOWN_STATUS", "请选择一种人物状态～")
      const next = { ...character, name: requireText(character.name), updatedAt: now() }
      item.characters[index] = next
      touch(item)
      return next
    },
    async characterDelete(projectId, id) {
      const item = project(projectId)
      const before = item.characters.length
      item.characters = item.characters.filter((entry) => entry.id !== id)
      // 如果人物删除后，人物列表长度不变，则抛出错误
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
        // 如果人物不存在，则抛出错误
        if (!item.characters.some((character) => character.id === person.characterId)) throw notFound()
      }
      // 更新事件
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
      // 更新故事线和章节的事件列表
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
      oneOf(kind, ARC_KINDS, "UNKNOWN_KIND", "请选择一种故事线～")
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
      oneOf(arc.kind, ARC_KINDS, "UNKNOWN_KIND", "请选择一种故事线～")
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
      if (new Set(eventIds).size !== eventIds.length) throw validation("DUPLICATE_LINK", "事件已经在里面了~")
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
      oneOf(chapter.status, CHAPTER_STATUS, "UNKNOWN_STATUS", "请选择一种状态～")
      if (new Set(chapter.characterIds).size !== chapter.characterIds.length) throw validation("DUPLICATE_LINK", "人物已经在里面了~")
      if (new Set(chapter.eventIds).size !== chapter.eventIds.length) throw validation("DUPLICATE_LINK", "事件已经在里面了~")
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
      const note: Note = { 
        id: uid(), 
        title: requireText(title), 
        content: "", 
        tags: [], 
        createdAt: stamp, 
        updatedAt: stamp,
      }
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
      // 将新的快照添加到列表的头部
      item.snapshots.unshift({ snapshotAt, body: bodyOf(item) })
      // 如果快照列表长度超过10，则删除最后一个快照
      item.snapshots = item.snapshots.slice(0, 10)
      // 持久化存储文件
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
      if (!snapshot) throw new ApiError("BACKUP_ERROR", "恢复没有执行~")
      // 生成一个安全的快照时间
      const safety: Snapshot["snapshotAt"] = `before-${now().replace(/[-:]/g, "")}`
      // 创建一个当前项目备份快照，并添加到列表的头部
      item.snapshots.unshift({ 
        snapshotAt: safety, 
        body: bodyOf(item) 
      })
      // 应用快照内容到项目
      applyBody(item, snapshot.body)
      item.snapshots = item.snapshots.slice(0, 10)
      touch(item)
      return item.summary
    },
  }

  /** 确保关系两端存在且类型和区间正确。无返回值。
   * @param item - 项目。
   * @param sourceId - 关系源人物 id。
   * @param targetId - 关系目标人物 id。
   * @param type - 关系类型。
   * @param span - 关系区间。
  */
  function assertRelation(item: StoredProject, sourceId: string, targetId: string, type: string, span: string) {
    if (sourceId === targetId) throw validation("SELF_RELATION", "不能把人物连向自己～")
    if (!item.characters.some((character) => character.id === sourceId)) throw notFound()  // 如果源人物不存在，则抛出错误
    if (!item.characters.some((character) => character.id === targetId)) throw notFound()  // 如果目标人物不存在，则抛出错误
    oneOf(type, RELATION_TYPES, "UNKNOWN_TYPE", "请选择一种关系类型～")
    oneOf(span, RELATION_SPANS, "UNKNOWN_STATUS", "选择一种关系持续时间～")
  }
}

/** 创建一个空项目。
 * 
 * @param summary - 项目摘要。
 * 
 * @returns 返回一个空项目，包含项目摘要、人物列表、关系列表、事件列表、故事线列表、章节列表、场景列表、笔记列表和图谱布局。
 */
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
    layout: { 
      viewport: { 
        x: 0, 
        y: 0, 
        zoom: 1 
      }, 
      nodes: {}, 
      updatedAt: summary.updatedAt 
    },
    snapshots: [],
  }
}

/** 生成快照内容。
 * 
 * @param item - 项目。
 * 
 * @returns 返回快照内容，包含人物列表、关系列表、事件列表、故事线列表、章节列表、场景列表、笔记列表和图谱布局。
*/
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
    summary: { 
      name: item.summary.name, 
      description: item.summary.description 
    },
  }
}

/** 应用快照内容到项目。无返回值。
 * @param item - 项目。
 * @param body - 快照内容。
*/
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

/** 确保检查的数组包含原始数组全部元素，且不能重复。
 * @param existing - 原始数组。
 * @param ids - 检查的数组。
 *  
 * @returns 如果检查的数组不包含原始数组全部元素，或检查的数组元素重复，则抛出 `DUPLICATE_LINK`。
*/
function permute(existing: string[], ids: string[]) {
  const same = existing.length === ids.length && existing.every((id) => ids.includes(id)) && new Set(ids).size === ids.length
  if (!same) throw validation("DUPLICATE_LINK", "顺序需要包含全部条目，且不能重复。")
}

/** 生成下一个排序号。
 * @param list - 排序号的列表。
 * 
 * @returns 返回下一个排序号，比列表中最大的排序号大1。
*/
function nextSort(list: Array<{ sortOrder: number }>) {
  return list.reduce((max, item) => Math.max(max, item.sortOrder), 0) + 1
}

/** 生成一个ISO时间字符串。
 * 
 * @returns 返回一个ISO时间字符串，格式为YYYY-MM-DDTHH:MM:SS.000Z。
*/
function now() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
}

/** 生成一个唯一的ID。
 * 
 * @returns 返回一个唯一的ID，长度为26个字符，由大小写字母和数字组成。
*/
function uid() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toUpperCase()
}

/** 加载存储文件。
 * 
 * @returns 返回加载后的存储文件，包含主题、是否已清理、恢复忽略、会话已读取和项目列表。
 * 如果存储文件不存在，或解析失败，则创建一个新的存储文件。
*/
function load(): MemoryFile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fresh()  // 如果存储文件不存在，则创建一个新的存储文件
    const parsed = JSON.parse(raw) as MemoryFile
    parsed.sessionRead = false  // 设置会话已读取为 false
    return parsed
  } catch {
    return fresh()  // 如果解析失败，则创建一个新的存储文件
  }
}

/** 创建一个新的存储文件。
 * 
 * @returns 返回一个新存储文件，包含主题、是否已清理、恢复忽略、会话已读取和项目列表。
*/
function fresh(): MemoryFile {
  return {
    theme: "paper",  // 设置主题为纸张
    clean: true,  // 设置为已清理
    recoverySkip: "",  // 设置恢复忽略为空
    sessionRead: false,  // 设置会话已读取为 false
    projects: [],  // 设置项目列表为空
  }
}
