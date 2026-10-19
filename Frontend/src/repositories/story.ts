import type {
  AppStateDto,
  Chapter,
  Character,
  GraphLayout,
  NodePos,
  Note,
  PluginInfo,
  ProjectSummary,
  Relation,
  Scene,
  SearchHit,
  Snapshot,
  StoryArc,
  StoryEvent,
  Viewport,
} from "../domain/types"

/**
 * 页面使用的项目库。桌面版走 Tauri 命令，浏览器里预览时走内存实现。
 * 失败时抛出 `ApiError`，错误码见 Docs/Errors.md。
 */
export interface StoryRepository {
  /**
   * 读取主题、最近项目，以及是否需要询问恢复。
   *
   * 返回应用状态。不写项目库。
   */
  appGetState(): Promise<AppStateDto>

  /**
   * 保存主题。
   *
   * * `theme` - `paper` 或 `ink`。
   *
   * 返回保存后的主题。其他取值抛出 `VALIDATION_ERROR`。
   */
  appSetTheme(theme: string): Promise<string>

  /**
   * 不再为这一份快照重复询问恢复。
   *
   * * `projectId` - 恢复提示里的项目。
   * * `snapshotAt` - 恢复提示里的快照时间。
   */
  appDismissRecovery(projectId: string, snapshotAt: string): Promise<void>

  /** 已注册的进程内插件。返回 id 和名称。 */
  pluginList(): Promise<PluginInfo[]>

  /** 最近项目，最近打开的在前。 */
  projectList(): Promise<ProjectSummary[]>

  /**
   * 新建项目。
   *
   * * `name` - 名称，不能为空白。
   * * `description` - 简介。
   *
   * 返回项目摘要。空白名称抛出 `EMPTY_NAME`。
   */
  projectCreate(name: string, description: string): Promise<ProjectSummary>

  /**
   * 打开项目。
   *
   * * `id` - 项目 id。
   *
   * 返回项目摘要。不存在时抛出 `NOT_FOUND`。
   */
  projectOpen(id: string): Promise<ProjectSummary>

  /**
   * 修改项目名称或简介。
   *
   * * `id` - 项目 id。
   * * `name` - 新名称。
   * * `description` - 新简介。
   *
   * 返回更新后的摘要。空白名称抛出 `EMPTY_NAME`。
   */
  projectUpdate(id: string, name: string, description: string): Promise<ProjectSummary>

  /** 关闭当前打开的项目库。文件仍留在磁盘上。 */
  projectClose(id: string): Promise<void>

  /** 人物列表。 * `projectId` - 项目 id。 */
  characterList(projectId: string): Promise<Character[]>

  /**
   * 新增人物。
   *
   * * `projectId` - 项目 id。
   * * `name` - 姓名。
   *
   * 返回新人物。空白姓名抛出 `EMPTY_NAME`。
   */
  characterCreate(projectId: string, name: string): Promise<Character>

  /**
   * 修改人物。
   *
   * * `projectId` - 项目 id。
   * * `character` - 保存后的档案。
   *
   * 返回保存后的人物。状态不在允许列表时抛出 `UNKNOWN_STATUS`。
   */
  characterUpdate(projectId: string, character: Character): Promise<Character>

  /**
   * 删除人物及其关系。章节和事件保留。
   *
   * * `projectId` - 项目 id。
   * * `id` - 人物 id。
   *
   * 不存在时抛出 `NOT_FOUND`。
   */
  characterDelete(projectId: string, id: string): Promise<void>

  /** 关系列表。 */
  relationList(projectId: string): Promise<Relation[]>

  /**
   * 建立关系。
   *
   * * `projectId` - 项目 id。
   * * `relation` - 两端、类型和说明。id 可空。
   *
   * 两端相同抛出 `SELF_RELATION`。类型不对抛出 `UNKNOWN_TYPE`。
   */
  relationCreate(projectId: string, relation: Pick<Relation, "sourceId" | "targetId" | "type" | "description" | "directional" | "span">): Promise<Relation>

  /**
   * 修改关系。
   *
   * * `projectId` - 项目 id。
   * * `relation` - 要保存的关系。
   */
  relationUpdate(projectId: string, relation: Relation): Promise<Relation>

  /** 删除关系，不删除人物。 */
  relationDelete(projectId: string, id: string): Promise<void>

  /** 读取图谱布局。 */
  graphLayoutGet(projectId: string): Promise<GraphLayout>

  /**
   * 保存视口，并合并本次移动的节点。
   *
   * * `viewport` - 缩放和平移。
   * * `nodes` - 改动过的节点。未出现的节点保持原坐标。
   */
  graphLayoutSave(projectId: string, viewport: Viewport, nodes: Record<string, NodePos>): Promise<GraphLayout>

  /** 事件列表，按故事内顺序。 */
  eventList(projectId: string): Promise<StoryEvent[]>
  /** 新增事件。标题不能为空白。 */
  eventCreate(projectId: string, title: string): Promise<StoryEvent>
  /** 修改事件。`participants` 会整体替换。 */
  eventUpdate(projectId: string, event: StoryEvent): Promise<StoryEvent>
  /** 删除事件。故事线和章节只解除引用。 */
  eventDelete(projectId: string, id: string): Promise<void>

  /**
   * 重排事件。
   *
   * * `ids` - 新顺序，必须包含全部事件且不能重复。
   *
   * 不满足时抛出 `DUPLICATE_LINK`。
   */
  eventReorder(projectId: string, ids: string[]): Promise<StoryEvent[]>

  /** 故事线列表。 */
  arcList(projectId: string): Promise<StoryArc[]>
  /** 新建故事线。 */
  arcCreate(projectId: string, title: string, kind?: string): Promise<StoryArc>
  /** 修改故事线的标题、类型或简介。 */
  arcUpdate(projectId: string, arc: StoryArc): Promise<StoryArc>
  /** 删除故事线。事件保留。 */
  arcDelete(projectId: string, id: string): Promise<void>

  /**
   * 替换一条故事线里的事件顺序。
   *
   * * `eventIds` - 新顺序。重复 id 抛出 `DUPLICATE_LINK`。
   */
  arcSetEvents(projectId: string, id: string, eventIds: string[]): Promise<StoryArc>

  /** 章节列表，按叙述顺序。 */
  chapterList(projectId: string): Promise<Chapter[]>
  /** 新建章节。 */
  chapterCreate(projectId: string, title: string): Promise<Chapter>
  /** 修改章节。`content` 保存 Markdown 原文。 */
  chapterUpdate(projectId: string, chapter: Chapter): Promise<Chapter>
  /** 删除章节及其场景。 */
  chapterDelete(projectId: string, id: string): Promise<void>
  /** 重排章节。`ids` 必须是全部章节的一个排列。 */
  chapterReorder(projectId: string, ids: string[]): Promise<Chapter[]>

  /** 某一章的场景。 */
  sceneList(projectId: string, chapterId: string): Promise<Scene[]>
  /** 新增场景。 */
  sceneCreate(projectId: string, chapterId: string, title: string): Promise<Scene>
  /** 修改场景。 */
  sceneUpdate(projectId: string, scene: Scene): Promise<Scene>
  /** 删除场景。 */
  sceneDelete(projectId: string, id: string): Promise<void>

  /** 笔记列表。 */
  noteList(projectId: string): Promise<Note[]>
  /** 新建笔记。 */
  noteCreate(projectId: string, title: string): Promise<Note>
  /** 修改笔记。 */
  noteUpdate(projectId: string, note: Note): Promise<Note>
  /** 删除笔记。 */
  noteDelete(projectId: string, id: string): Promise<void>

  /**
   * 搜索人物、事件、故事线、章节和笔记。
   *
   * * `query` - 关键字。空白时返回空数组。
   */
  search(projectId: string, query: string): Promise<SearchHit[]>

  /** 为项目做一份快照。返回快照时间。 */
  backupCreate(projectId: string): Promise<Snapshot>
  /** 列出项目的快照，最多 10 条，新的在前。 */
  backupList(projectId: string): Promise<Snapshot[]>

  /**
   * 用快照替换项目库。
   *
   * * `snapshotAt` - 快照时间。找不到时抛出 `BACKUP_ERROR`。
   */
  backupRestore(projectId: string, snapshotAt: string): Promise<ProjectSummary>
}
