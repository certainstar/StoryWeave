import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { useRouter } from "vue-router"
import type {
  Chapter,
  Character,
  GraphLayout,
  Note,
  PluginInfo,
  ProjectSummary,
  Recovery,
  Relation,
  Scene,
  SearchHit,
  Snapshot,
  StoryArc,
  StoryEvent,
  ViewId,
} from "../domain/types"
import { ApiError, repository } from "../repositories"

export type Selection =
  | { kind: "character" | "relation" | "event" | "arc" | "chapter" | "note" | "scene"; id: string }
  | null

const SAVE_DELAY = 800

/**
 * 工作台状态。页面只通过这里读写，不直接调用命令。
 *
 * 写入会合并约 0.8 秒。顶栏的保存时间只在命令成功后更新。
 * 失败时 `statusLabel` 使用 `ApiError.message`。
 */
export const useWorkspace = defineStore("workspace", () => {
  const router = useRouter()
  const repo = repository()

  const theme = ref<"paper" | "ink">("paper")
  const recent = ref<ProjectSummary[]>([])
  const recovery = ref<Recovery>({ needed: false })
  const project = ref<ProjectSummary | null>(null)
  const characters = ref<Character[]>([])
  const relations = ref<Relation[]>([])
  const events = ref<StoryEvent[]>([])
  const arcs = ref<StoryArc[]>([])
  const chapters = ref<Chapter[]>([])
  const scenes = ref<Scene[]>([])
  const notes = ref<Note[]>([])
  const layout = ref<GraphLayout>({ viewport: { x: 0, y: 0, zoom: 1 }, nodes: {}, updatedAt: "" })
  const plugins = ref<PluginInfo[]>([])
  const snapshots = ref<Snapshot[]>([])
  const selection = ref<Selection>(null)
  const draft = ref<Pick<Relation, "sourceId" | "targetId" | "type" | "description" | "directional" | "span"> | null>(null)
  const confirm = ref<{ kind: string; id: string; message: string } | null>(null)
  const savePhase = ref<"idle" | "pending" | "saved" | "error">("idle")
  const savedAt = ref("")
  const notice = ref("")
  const characterFilter = ref("")
  const statusFilter = ref("全部")
  const hiddenTypes = ref<string[]>([])
  const searchHits = ref<SearchHit[]>([])
  const searchOpen = ref(false)

  const timers = new Map<string, number>()
  const pending = new Set<string>()

  const statusLabel = computed(() => {
    if (savePhase.value === "pending") return "正在保存"
    if (savePhase.value === "error") return notice.value || "刚才这次没有保存。可以重试。"
    if (savePhase.value === "saved" && savedAt.value) return `已保存 ${savedAt.value}`
    return "尚未改动"
  })

  const projectId = () => {
    if (!project.value) throw new ApiError("NOT_FOUND", "对象已不在。回到列表。")
    return project.value.id
  }

  function applyTheme(next: string) {
    const value = next === "ink" ? "ink" : "paper"
    theme.value = value
    document.documentElement.dataset.theme = value
  }

  function fail(error: unknown) {
    savePhase.value = "error"
    notice.value = error instanceof ApiError ? error.message : "刚才这次没有保存。可以重试。"
  }

  function succeed() {
    if (pending.size === 0) {
      savePhase.value = "saved"
      savedAt.value = new Date().toLocaleTimeString("zh-CN", { hour12: false })
      notice.value = ""
    }
  }

  /**
   * 把一次写入推迟约 0.8 秒。同一把钥匙的新修改会取消上一次。
   *
   * * `key` - 这次修改的对象。
   * * `task` - 真正发给仓库的函数。失败时抛出 `ApiError`。
   */
  function queue(key: string, task: () => Promise<void>) {
    pending.add(key)
    savePhase.value = "pending"
    const previous = timers.get(key)
    if (previous) window.clearTimeout(previous)
    timers.set(
      key,
      window.setTimeout(() => {
        timers.delete(key)
        void task()
          .then(() => {
            pending.delete(key)
            succeed()
          })
          .catch((error: unknown) => {
            pending.delete(key)
            fail(error)
          })
      }, SAVE_DELAY),
    )
  }

  function cancel(key: string) {
    const timer = timers.get(key)
    if (timer) window.clearTimeout(timer)
    timers.delete(key)
    pending.delete(key)
  }

  async function boot() {
    const state = await repo.appGetState()
    applyTheme(state.theme)
    recent.value = state.recent
    recovery.value = state.recovery
    plugins.value = await repo.pluginList()
  }

  async function setTheme(next: "paper" | "ink") {
    applyTheme(next)
    try {
      applyTheme(await repo.appSetTheme(next))
    } catch (error) {
      fail(error)
    }
  }

  async function dismissRecovery() {
    const current = recovery.value
    if (current.projectId && current.snapshotAt) {
      await repo.appDismissRecovery(current.projectId, current.snapshotAt)
    }
    recovery.value = { needed: false }
  }

  async function restoreRecovery() {
    const current = recovery.value
    if (!current.projectId || !current.snapshotAt) return
    const summary = await repo.backupRestore(current.projectId, current.snapshotAt)
    recovery.value = { needed: false }
    recent.value = await repo.projectList()
    await openProject(summary.id)
  }

  async function createProject(name: string, description: string) {
    const summary = await repo.projectCreate(name, description)
    recent.value = await repo.projectList()
    await openProject(summary.id)
    return summary
  }

  async function loadProject(id: string) {
    if (project.value?.id === id && characters.value) return
    const summary = await repo.projectOpen(id)
    project.value = summary
    selection.value = null
    draft.value = null
    confirm.value = null
    savePhase.value = "idle"
    savedAt.value = ""
    await reload()
  }

  async function openProject(id: string) {
    await loadProject(id)
    await router.push({ name: "overview", params: { id } })
  }

  async function reload() {
    const id = projectId()
    const [nextCharacters, nextRelations, nextEvents, nextArcs, nextChapters, nextNotes, nextLayout, nextSnapshots] = await Promise.all([
      repo.characterList(id),
      repo.relationList(id),
      repo.eventList(id),
      repo.arcList(id),
      repo.chapterList(id),
      repo.noteList(id),
      repo.graphLayoutGet(id),
      repo.backupList(id),
    ])
    characters.value = nextCharacters
    relations.value = nextRelations
    events.value = nextEvents
    arcs.value = nextArcs
    chapters.value = nextChapters
    notes.value = nextNotes
    layout.value = nextLayout
    snapshots.value = nextSnapshots
    const groups = await Promise.all(nextChapters.map((chapter) => repo.sceneList(id, chapter.id)))
    scenes.value = groups.flat()
    const opened = await repo.projectOpen(id)
    project.value = opened
  }

  function select(next: Selection, view?: ViewId) {
    selection.value = next
    confirm.value = null
    if (next?.kind !== "relation") draft.value = null
    if (view && project.value) {
      void router.push({ name: view, params: { id: project.value.id } })
    }
  }

  function scheduleProject() {
    const current = project.value
    if (!current) return
    queue(`project:${current.id}`, async () => {
      project.value = await repo.projectUpdate(current.id, current.name, current.description)
      recent.value = await repo.projectList()
    })
  }

  function scheduleCharacter(id: string) {
    queue(`character:${id}`, async () => {
      const current = characters.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.characterUpdate(projectId(), current)
      current.updatedAt = saved.updatedAt
    })
  }

  function scheduleRelation(id: string) {
    queue(`relation:${id}`, async () => {
      const current = relations.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.relationUpdate(projectId(), current)
      Object.assign(current, saved)
    })
  }

  function scheduleEvent(id: string) {
    queue(`event:${id}`, async () => {
      const current = events.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.eventUpdate(projectId(), current)
      current.updatedAt = saved.updatedAt
    })
  }

  function scheduleArc(id: string) {
    queue(`arc:${id}`, async () => {
      const current = arcs.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.arcUpdate(projectId(), current)
      current.updatedAt = saved.updatedAt
      current.title = saved.title
    })
  }

  function scheduleChapter(id: string) {
    queue(`chapter:${id}`, async () => {
      const current = chapters.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.chapterUpdate(projectId(), current)
      current.updatedAt = saved.updatedAt
    })
  }

  function scheduleScene(id: string) {
    queue(`scene:${id}`, async () => {
      const current = scenes.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.sceneUpdate(projectId(), current)
      current.updatedAt = saved.updatedAt
    })
  }

  function scheduleNote(id: string) {
    queue(`note:${id}`, async () => {
      const current = notes.value.find((item) => item.id === id)
      if (!current) return
      const saved = await repo.noteUpdate(projectId(), current)
      current.updatedAt = saved.updatedAt
    })
  }

  function scheduleLayout(nodeId?: string) {
    queue("layout", async () => {
      const nodes = nodeId && layout.value.nodes[nodeId] ? { [nodeId]: layout.value.nodes[nodeId] } : {}
      layout.value = await repo.graphLayoutSave(projectId(), layout.value.viewport, nodes)
    })
  }

  async function createCharacter() {
    const created = await repo.characterCreate(projectId(), "未命名人物")
    characters.value.push(created)
    select({ kind: "character", id: created.id }, "characters")
    markSaved()
  }

  async function createEvent() {
    const created = await repo.eventCreate(projectId(), "未命名事件")
    events.value.push(created)
    select({ kind: "event", id: created.id }, "timeline")
    markSaved()
  }

  async function createChapter() {
    const created = await repo.chapterCreate(projectId(), "未命名章节")
    chapters.value.push(created)
    select({ kind: "chapter", id: created.id }, "chapters")
    markSaved()
  }

  async function createArc() {
    const created = await repo.arcCreate(projectId(), "未命名故事线")
    arcs.value.push(created)
    select({ kind: "arc", id: created.id }, "arcs")
    markSaved()
  }

  async function createNote() {
    const created = await repo.noteCreate(projectId(), "未命名笔记")
    notes.value.unshift(created)
    select({ kind: "note", id: created.id }, "notes")
    markSaved()
  }

  async function createScene(chapterId: string) {
    const created = await repo.sceneCreate(projectId(), chapterId, "未命名场景")
    scenes.value.push(created)
    markSaved()
  }

  function beginRelation(sourceId = "") {
    const fallback = characters.value.find((item) => item.id !== sourceId)
    draft.value = {
      sourceId: sourceId || characters.value[0]?.id || "",
      targetId: fallback?.id || "",
      type: "未知",
      description: "",
      directional: true,
      span: "未知",
    }
    selection.value = null
    confirm.value = null
    if (project.value) void router.push({ name: "graph", params: { id: project.value.id } })
  }

  async function saveDraft() {
    if (!draft.value) return
    try {
      const created = await repo.relationCreate(projectId(), draft.value)
      relations.value.push(created)
      draft.value = null
      select({ kind: "relation", id: created.id }, "graph")
      markSaved()
    } catch (error) {
      fail(error)
    }
  }

  function askDelete(kind: string, id: string, message: string) {
    confirm.value = { kind, id, message }
  }

  async function confirmDelete() {
    const current = confirm.value
    if (!current) return
    const id = projectId()
    cancel(`${current.kind}:${current.id}`)
    if (current.kind === "character") await repo.characterDelete(id, current.id)
    if (current.kind === "relation") await repo.relationDelete(id, current.id)
    if (current.kind === "event") await repo.eventDelete(id, current.id)
    if (current.kind === "arc") await repo.arcDelete(id, current.id)
    if (current.kind === "chapter") await repo.chapterDelete(id, current.id)
    if (current.kind === "note") await repo.noteDelete(id, current.id)
    if (current.kind === "scene") await repo.sceneDelete(id, current.id)
    confirm.value = null
    selection.value = null
    await reload()
    markSaved()
  }

  async function moveEvent(id: string, delta: number) {
    const sorted = [...events.value].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = sorted.findIndex((item) => item.id === id)
    const next = index + delta
    if (index < 0 || next < 0 || next >= sorted.length) return
    const ids = sorted.map((item) => item.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(next, 0, moved)
    events.value = await repo.eventReorder(projectId(), ids)
    markSaved()
  }

  async function moveChapter(id: string, delta: number) {
    const sorted = [...chapters.value].sort((a, b) => a.sortOrder - b.sortOrder)
    const index = sorted.findIndex((item) => item.id === id)
    const next = index + delta
    if (index < 0 || next < 0 || next >= sorted.length) return
    const ids = sorted.map((item) => item.id)
    const [moved] = ids.splice(index, 1)
    ids.splice(next, 0, moved)
    chapters.value = await repo.chapterReorder(projectId(), ids)
    markSaved()
  }

  async function setArcEvents(id: string, eventIds: string[]) {
    const saved = await repo.arcSetEvents(projectId(), id, eventIds)
    const current = arcs.value.find((item) => item.id === id)
    if (current) current.eventIds = saved.eventIds
    markSaved()
  }

  async function search(query: string) {
    if (!project.value || !query.trim()) {
      searchHits.value = []
      searchOpen.value = false
      return
    }
    searchHits.value = await repo.search(project.value.id, query)
    searchOpen.value = true
  }

  async function makeBackup() {
    const snapshot = await repo.backupCreate(projectId())
    snapshots.value = await repo.backupList(projectId())
    markSaved()
    return snapshot
  }

  async function restoreBackup(snapshotAt: string) {
    project.value = await repo.backupRestore(projectId(), snapshotAt)
    await reload()
    markSaved()
  }

  async function seedSample() {
    const summary = await createProject("北境剑录", "一部以北境剑庐为起点的长篇示例。沈照离庐三年，名册没有销名。")
    const id = summary.id
    const people = [
      ["李玄", "剑庐主持", "在场", "保住剑庐名册上尚未销名的人。"],
      ["林默", "弟子", "在场", "找到离开剑庐的师姐沈照。"],
      ["沈照", "大师姐", "下落不明", "未知。离庐时没有销名。"],
      ["顾衡", "边镇都尉", "在场", "查清承安四年秋的城北火。"],
    ] as const
    const createdPeople: Character[] = []
    for (const [name, role, status, goal] of people) {
      const character = await repo.characterCreate(id, name)
      character.role = role
      character.status = status
      character.goal = goal
      createdPeople.push(await repo.characterUpdate(id, character))
    }
    const [li, lin, shen, gu] = createdPeople
    await repo.relationCreate(id, { sourceId: li.id, targetId: lin.id, type: "师徒", description: "承安元年，李玄收林默为弟子。", directional: true, span: "当前" })
    await repo.relationCreate(id, { sourceId: li.id, targetId: shen.id, type: "师徒", description: "沈照是李玄收下的第一个弟子。", directional: true, span: "过去" })
    await repo.relationCreate(id, { sourceId: lin.id, targetId: shen.id, type: "同门", description: "林默称沈照为师姐。", directional: true, span: "当前" })
    await repo.relationCreate(id, { sourceId: gu.id, targetId: li.id, type: "旧识", description: "边镇与剑庐有出人应援的旧约。", directional: false, span: "过去" })
    const leave = await repo.eventCreate(id, "沈照离庐")
    leave.storyTime = "承安三年冬"
    leave.description = "沈照离开，名册没有销名。"
    leave.participants = [{ characterId: shen.id, role: "" }, { characterId: li.id, role: "" }]
    const south = await repo.eventCreate(id, "林默南下")
    south.storyTime = "承安五年春"
    south.description = "林默沿官道离开北境，去找沈照。"
    south.participants = [{ characterId: lin.id, role: "" }, { characterId: li.id, role: "" }]
    const raid = await repo.eventCreate(id, "边镇夜袭")
    raid.storyTime = "承安四年秋"
    raid.description = "城北起火，顾衡负伤。李玄当天不在镇上。"
    raid.participants = [{ characterId: gu.id, role: "" }]
    await repo.eventUpdate(id, leave)
    await repo.eventUpdate(id, south)
    await repo.eventUpdate(id, raid)
    const main = await repo.arcCreate(id, "寻人", "主线")
    main.summary = "林默查清沈照为什么没有销名。"
    await repo.arcUpdate(id, main)
    await repo.arcSetEvents(id, main.id, [leave.id, south.id])
    const side = await repo.arcCreate(id, "边镇旧约", "支线")
    side.summary = "剑庐欠边镇一次出人。"
    await repo.arcUpdate(id, side)
    await repo.arcSetEvents(id, side.id, [raid.id])
    const snow = await repo.chapterCreate(id, "雪线")
    snow.status = "草稿"
    snow.summary = "叙述从南下那天早晨开始。"
    snow.content = "林默在官道边站到天色发白。剑还是离庐前那一把，鞘口的漆已经掉了。\n\n他没有再回头看剑庐的方向。名册上，沈照的名字还在。"
    snow.characterIds = [lin.id]
    snow.eventIds = [south.id]
    await repo.chapterUpdate(id, snow)
    const pact = await repo.chapterCreate(id, "旧约")
    pact.summary = "回溯边镇夜袭，并写明名册规矩。"
    pact.content = "夜袭发生在承安四年秋。顾衡后来只说，城北的火不是军中升起的。\n\n李玄那天不在边上。他让林默记住：没销名的人，不算离开。"
    pact.characterIds = [gu.id, li.id, lin.id]
    pact.eventIds = [raid.id]
    await repo.chapterUpdate(id, pact)
    await repo.sceneCreate(id, snow.id, "官道")
    const road = await repo.noteCreate(id, "北境道路")
    road.tags = ["地理"]
    road.content = "入冬之后，北境只剩一条官道还能走车。"
    await repo.noteUpdate(id, road)
    const positions = {
      [li.id]: { x: 300, y: 28 },
      [lin.id]: { x: 36, y: 280 },
      [shen.id]: { x: 300, y: 280 },
      [gu.id]: { x: 580, y: 280 },
    }
    await repo.graphLayoutSave(id, { x: 0, y: 0, zoom: 1 }, positions)
    await repo.backupCreate(id)
    await reload()
  }

  function markSaved() {
    savePhase.value = "saved"
    savedAt.value = new Date().toLocaleTimeString("zh-CN", { hour12: false })
    notice.value = ""
  }

  const narrativeMismatch = computed(() => {
    const told = [...events.value]
      .filter((event) => chapters.value.some((chapter) => chapter.eventIds.includes(event.id)))
      .sort((a, b) => a.sortOrder - b.sortOrder)
    if (told.length < 2) return ""
    const byNarrative = [...told].sort((a, b) => {
      const chapterA = chapters.value.filter((chapter) => chapter.eventIds.includes(a.id)).sort((x, y) => x.sortOrder - y.sortOrder)[0]
      const chapterB = chapters.value.filter((chapter) => chapter.eventIds.includes(b.id)).sort((x, y) => x.sortOrder - y.sortOrder)[0]
      return (chapterA?.sortOrder ?? 0) - (chapterB?.sortOrder ?? 0)
    })
    const differs = told.some((event, index) => event.id !== byNarrative[index]?.id)
    return differs ? "有些事件的叙述顺序和故事内顺序不一致。时间线会把两种顺序一起标出来。" : ""
  })

  return {
    theme,
    recent,
    recovery,
    project,
    characters,
    relations,
    events,
    arcs,
    chapters,
    scenes,
    notes,
    layout,
    plugins,
    snapshots,
    selection,
    draft,
    confirm,
    statusLabel,
    notice,
    characterFilter,
    statusFilter,
    hiddenTypes,
    searchHits,
    searchOpen,
    narrativeMismatch,
    boot,
    setTheme,
    dismissRecovery,
    restoreRecovery,
    createProject,
    loadProject,
    openProject,
    reload,
    select,
    scheduleProject,
    scheduleCharacter,
    scheduleRelation,
    scheduleEvent,
    scheduleArc,
    scheduleChapter,
    scheduleScene,
    scheduleNote,
    scheduleLayout,
    createCharacter,
    createEvent,
    createChapter,
    createArc,
    createNote,
    createScene,
    beginRelation,
    saveDraft,
    askDelete,
    confirmDelete,
    moveEvent,
    moveChapter,
    setArcEvents,
    search,
    makeBackup,
    restoreBackup,
    seedSample,
  }
})
