/** 人物档案。 */
export interface Character {
  id: string
  name: string
  aliases: string[]
  role: string
  appearance: string
  personality: string
  goal: string
  background: string
  notes: string
  status: string
  createdAt: string
  updatedAt: string
}

/** 两个人物之间的一条关系。 */
export interface Relation {
  id: string
  sourceId: string
  targetId: string
  type: string
  description: string
  directional: boolean
  span: string
  createdAt: string
  updatedAt: string
}

/** 事件里的一个参与者。 */
export interface EventParticipant {
  characterId: string
  role: string
}

/** 故事事件。`sortOrder` 是故事内顺序。 */
export interface StoryEvent {
  id: string
  title: string
  description: string
  storyTime: string | null
  sortOrder: number
  participants: EventParticipant[]
  createdAt: string
  updatedAt: string
}

/** 故事线。`eventIds` 的顺序只属于这一条线。 */
export interface StoryArc {
  id: string
  title: string
  kind: string
  summary: string
  sortOrder: number
  eventIds: string[]
  createdAt: string
  updatedAt: string
}

/** 章节。`content` 是 Markdown 原文。 */
export interface Chapter {
  id: string
  title: string
  status: string
  summary: string
  content: string
  sortOrder: number
  characterIds: string[]
  eventIds: string[]
  createdAt: string
  updatedAt: string
}

/** 章节下的场景。 */
export interface Scene {
  id: string
  chapterId: string
  title: string
  summary: string
  storyTime: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

/** 笔记。 */
export interface Note {
  id: string
  title: string
  content: string
  tags: string[]
  createdAt: string
  updatedAt: string
}

/** 图谱视口。 */
export interface Viewport {
  x: number
  y: number
  zoom: number
}

/** 一个节点的坐标。 */
export interface NodePos {
  x: number
  y: number
}

/** 图谱布局。坐标不属于人物档案。 */
export interface GraphLayout {
  viewport: Viewport
  nodes: Record<string, NodePos>
  updatedAt: string
}

/** 最近项目列表里的一条。 */
export interface ProjectSummary {
  id: string
  name: string
  description: string
  path: string
  updatedAt: string
  lastOpenedAt: string
}

/** 搜索结果里的一条。 */
export interface SearchHit {
  kind: string
  id: string
  title: string
}

/** 一份快照。 */
export interface Snapshot {
  snapshotAt: string
  path: string
}

/** 上次退出不完整时，用来询问是否恢复。 */
export interface Recovery {
  needed: boolean
  projectId?: string | null
  snapshotAt?: string | null
}

/** 应用启动时界面需要的状态。 */
export interface AppStateDto {
  theme: string
  recent: ProjectSummary[]
  recovery: Recovery
}

/** 已注册插件的名称。 */
export interface PluginInfo {
  id: string
  name: string
}

export const CHARACTER_STATUS = ["在场", "离场", "下落不明"] as const
export const RELATION_TYPES = ["亲属", "师徒", "恋爱", "合作", "敌对", "利用", "同门", "旧识", "未知"] as const
export const RELATION_SPANS = ["当前", "过去", "未知"] as const
export const ARC_KINDS = ["主线", "支线", "人物线", "感情线"] as const
export const CHAPTER_STATUS = ["构思中", "草稿", "修订中", "完成"] as const

export const VIEWS = [
  { id: "overview", index: "01", label: "概览", blurb: "人物、关系、事件和章节从这里连在一起。" },
  { id: "characters", index: "02", label: "人物", blurb: "人物档案是关系图和章节引用的来源。" },
  { id: "graph", index: "03", label: "关系图", blurb: "拖动节点只改变布局。布局与人物资料分开保存。" },
  { id: "arcs", index: "04", label: "故事线", blurb: "故事线排列事件的叙事顺序，不改写事件本身。" },
  { id: "timeline", index: "05", label: "时间线", blurb: "这里按故事内顺序排列。它不必和章节顺序相同。" },
  { id: "chapters", index: "06", label: "章节", blurb: "正文按 Markdown 原文保存，右侧是预览。" },
  { id: "notes", index: "07", label: "笔记", blurb: "还没升格为正式设定的记录放在这里。" },
  { id: "settings", index: "08", label: "设置", blurb: "主题、快照和插件都留在这台电脑上。" },
] as const

export type ViewId = (typeof VIEWS)[number]["id"]
