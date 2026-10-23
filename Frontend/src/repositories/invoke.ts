import { invoke } from "@tauri-apps/api/core"
import type { AppStateDto, Chapter, Note, PluginInfo, ProjectSummary, Scene, SearchHit, Snapshot } from "../domain/types"
import { ApiError } from "./errors"
import type { StoryRepository } from "./story"

/** 信封。 */
interface Envelope<T> {
  /** 是否成功。 */
  ok: boolean
  /** 数据，成功时才有。 */
  data?: T
  /** 错误，失败时才有。 */
  error?: { code: string; reason?: string; message: string }
}

/**
 * 调用一条 Tauri 命令，并把信封拆开。如果失败，则抛出 `ApiError`。
 *
 * @param command - 命令名，与 Rust 函数同名。
 * @param args - 驼峰参数。可以省略。
 *
 * @returns 返回数据。`ok` 为假时抛出 `ApiError`，错误码原样带上。
*/
export async function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  const result = await invoke<Envelope<T>>(command, args)
  if (!result.ok || result.error) {
    const error = result.error
    throw new ApiError(
      error?.code ?? "STORAGE_ERROR", 
      error?.message ?? "刚才这次没有保存，请稍后重试~", 
      error?.reason ?? "请稍后重试~"
    )
  }
  return result.data as T
}

/** 生产环境仓库实例。每个方法对应一条 Rust 命令。 */
export function createInvokeRepository(): StoryRepository {
  return {
    async appGetState() {
      return call<AppStateDto>("app_get_state")
    },
    async appSetTheme(theme) {
      const saved = await call<{ theme: string }>("app_set_theme", { theme })
      return saved.theme
    },
    async appDismissRecovery(projectId, snapshotAt) {
      await call("app_dismiss_recovery", { projectId, snapshotAt })
    },
    pluginList: () => call<PluginInfo[]>("plugin_list"),
    projectList: () => call<ProjectSummary[]>("project_list"),
    projectCreate: (name, description) => call("project_create", { name, description }),
    projectOpen: (id) => call("project_open", { id }),
    projectUpdate: (id, name, description) => call("project_update", { id, name, description }),
    async projectClose(id) {
      await call("project_close", { id })
    },
    characterList: (projectId) => call("character_list", { projectId }),
    characterCreate: (projectId, name) => call("character_create", { projectId, name }),
    characterUpdate: (projectId, character) =>
      call("character_update", {
        projectId,
        id: character.id,
        name: character.name,
        aliases: character.aliases,
        role: character.role,
        appearance: character.appearance,
        personality: character.personality,
        goal: character.goal,
        background: character.background,
        notes: character.notes,
        status: character.status,
      }),
    async characterDelete(projectId, id) {
      await call("character_delete", { projectId, id })
    },
    relationList: (projectId) => call("relation_list", { projectId }),
    relationCreate: (projectId, relation) =>
      call("relation_create", {
        projectId,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        type: relation.type,
        description: relation.description,
        directional: relation.directional,
        span: relation.span,
      }),
    relationUpdate: (projectId, relation) =>
      call("relation_update", {
        projectId,
        id: relation.id,
        sourceId: relation.sourceId,
        targetId: relation.targetId,
        type: relation.type,
        description: relation.description,
        directional: relation.directional,
        span: relation.span,
      }),
    async relationDelete(projectId, id) {
      await call("relation_delete", { projectId, id })
    },
    graphLayoutGet: (projectId) => call("graph_layout_get", { projectId }),
    graphLayoutSave: (projectId, viewport, nodes) => call("graph_layout_save", { projectId, viewport, nodes }),
    eventList: (projectId) => call("event_list", { projectId }),
    eventCreate: (projectId, title) => call("event_create", { projectId, title }),
    eventUpdate: (projectId, event) =>
      call("event_update", {
        projectId,
        id: event.id,
        title: event.title,
        description: event.description,
        storyTime: event.storyTime ?? "",
        participants: event.participants,
      }),
    async eventDelete(projectId, id) {
      await call("event_delete", { projectId, id })
    },
    eventReorder: (projectId, ids) => call("event_reorder", { projectId, ids }),
    arcList: (projectId) => call("story_arc_list", { projectId }),
    arcCreate: (projectId, title, kind) => call("story_arc_create", { projectId, title, kind }),
    arcUpdate: (projectId, arc) =>
      call("story_arc_update", {
        projectId,
        id: arc.id,
        title: arc.title,
        kind: arc.kind,
        summary: arc.summary,
      }),
    async arcDelete(projectId, id) {
      await call("story_arc_delete", { projectId, id })
    },
    arcSetEvents: (projectId, id, eventIds) => call("story_arc_set_events", { projectId, id, eventIds }),
    chapterList: (projectId) => call("chapter_list", { projectId }),
    chapterCreate: (projectId, title) => call("chapter_create", { projectId, title }),
    chapterUpdate: (projectId, chapter) =>
      call<Chapter>("chapter_update", {
        projectId,
        id: chapter.id,
        title: chapter.title,
        status: chapter.status,
        summary: chapter.summary,
        content: chapter.content,
        characterIds: chapter.characterIds,
        eventIds: chapter.eventIds,
      }),
    async chapterDelete(projectId, id) {
      await call("chapter_delete", { projectId, id })
    },
    chapterReorder: (projectId, ids) => call("chapter_reorder", { projectId, ids }),
    sceneList: (projectId, chapterId) => call("scene_list", { projectId, chapterId }),
    sceneCreate: (projectId, chapterId, title) => call("scene_create", { projectId, chapterId, title }),
    sceneUpdate: (projectId, scene) =>
      call<Scene>("scene_update", {
        projectId,
        id: scene.id,
        title: scene.title,
        summary: scene.summary,
        storyTime: scene.storyTime ?? "",
      }),
    async sceneDelete(projectId, id) {
      await call("scene_delete", { projectId, id })
    },
    noteList: (projectId) => call("note_list", { projectId }),
    noteCreate: (projectId, title) => call("note_create", { projectId, title }),
    noteUpdate: (projectId, note) =>
      call<Note>("note_update", {
        projectId,
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
      }),
    async noteDelete(projectId, id) {
      await call("note_delete", { projectId, id })
    },
    search: (projectId, query) => call<SearchHit[]>("search_query", { projectId, query }),
    backupCreate: (projectId) => call<Snapshot>("backup_create", { projectId }),
    backupList: (projectId) => call("backup_list", { projectId }),
    backupRestore: (projectId, snapshotAt) => call("backup_restore", { projectId, snapshotAt }),
  }
}
