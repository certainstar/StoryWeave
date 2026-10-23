/** 人物档案。 */
export interface Character {
  id: string  // 人物ID
  name: string  // 人物名称
  aliases: string[]  // 人物别名
  role: string  // 人物角色
  appearance: string  // 人物外观
  personality: string  // 人物性格
  goal: string  // 人物目标
  background: string  // 人物背景
  notes: string  // 人物笔记
  status: string  // 人物状态
  createdAt: string  // 人物创建时间
  updatedAt: string  // 人物更新时间
}

/** 两个人物之间的一条关系。 */
export interface Relation {
  id: string  // 关系ID
  sourceId: string  // 源人物ID
  targetId: string  // 目标人物ID
  type: string  // 关系类型
  description: string  // 关系描述
  directional: boolean  // 是否双向关系
  span: string  // 关系时间跨度
  createdAt: string  // 关系创建时间
  updatedAt: string  // 关系更新时间
}

/** 事件里的一个参与者。 */
export interface EventParticipant {
  characterId: string  // 人物ID
  role: string  // 人物角色
}

/** 故事事件。`sortOrder` 是故事内顺序。 */
export interface StoryEvent {
  id: string  // 事件ID
  title: string  // 事件标题
  description: string  // 事件描述
  storyTime: string | null  // 事件时间
  sortOrder: number  // 事件排序
  participants: EventParticipant[]  // 事件参与者
  createdAt: string  // 事件创建时间
  updatedAt: string  // 事件更新时间
}

/** 故事线。`eventIds` 的顺序只属于这一条线。 */
export interface StoryArc {
  id: string  // 故事线ID 
  title: string  // 故事线标题
  kind: string  // 故事线类型
  summary: string  // 故事线摘要
  sortOrder: number  // 故事线排序
  eventIds: string[]  // 事件ID列表
  createdAt: string  // 故事线创建时间
  updatedAt: string  // 故事线更新时间
}

/** 章节。`content` 是 Markdown 原文。 */
export interface Chapter {
  id: string  // 章节ID
  title: string  // 章节标题
  status: string  // 章节状态
  summary: string  // 章节摘要
  content: string  // 章节内容
  sortOrder: number  // 章节排序
  characterIds: string[]  // 人物ID列表
  eventIds: string[]  // 事件ID列表
  createdAt: string  // 章节创建时间
  updatedAt: string  // 章节更新时间
}

/** 章节下的场景。 */
export interface Scene {
  id: string  // 场景ID
  chapterId: string  // 章节ID
  title: string  // 场景标题
  summary: string  // 场景摘要
  storyTime: string | null  // 场景时间
  sortOrder: number  // 场景排序
  createdAt: string  // 场景创建时间
  updatedAt: string  // 场景更新时间
}

/** 笔记。 */
export interface Note {
  id: string  // 笔记ID
  title: string  // 笔记标题
  content: string  // 笔记内容
  tags: string[]  // 笔记标签
  createdAt: string  // 笔记创建时间
  updatedAt: string  // 笔记更新时间
}

/** 图谱视口。 */
export interface Viewport {
  x: number  // 视口X坐标
  y: number  // 视口Y坐标
  zoom: number  // 视口缩放比例
}

/** 一个节点的坐标。 */
export interface NodePos {
  x: number  // 节点X坐标
  y: number  // 节点Y坐标
}

/** 图谱布局。坐标不属于人物档案。 */
export interface GraphLayout {
  viewport: Viewport  // 视口
  nodes: Record<string, NodePos>  // 节点列表
  updatedAt: string  // 图谱更新时间
}

/** 项目摘要。 */
export interface ProjectSummary {
  id: string  // 项目ID
  name: string  // 项目名称
  description: string  // 项目描述
  path: string  // 项目路径
  updatedAt: string  // 项目更新时间
  lastOpenedAt: string  // 项目最后打开时间
}

/** 搜索结果。 */
export interface SearchHit {
  kind: string  // 搜索结果类型
  id: string  // 搜索结果ID
  title: string  // 搜索结果标题
}

/** 快照。 */
export interface Snapshot {
  snapshotAt: string  // 快照时间
  path: string  // 快照路径
}

/** 上次退出不完整时，用来询问是否恢复。 */
export interface Recovery {
  needed: boolean  // 是否需要恢复
  projectId?: string | null  // 项目ID
  snapshotAt?: string | null  // 快照时间
}

/** 应用启动时界面需要的状态。 */
export interface AppStateDto {
  theme: string  // 主题
  recent: ProjectSummary[]  // 最近项目列表
  recovery: Recovery  // 恢复状态
}

/** 已注册插件的名称。 */
export interface PluginInfo {
  id: string  // 插件ID
  name: string  // 插件名称
}

export const CHARACTER_STATUS = ["在场", "场外", "下落不明", "已故", "暗处", "虚拟", "待定"] as const
export const RELATION_TYPES = ["家人", "师徒", "暗恋", "明恋", "合作", "仇敌", "利用", "同门", "旧识", "心结", "恩怨", "伴侣", "待定"] as const
export const RELATION_SPANS = ["当前", "过去", "未来", "待定"] as const
export const ARC_KINDS = ["主线", "支线", "人物线", "感情线", "待定"] as const
export const CHAPTER_STATUS = ["构思中", "草稿", "修订中", "完成", "待定"] as const

export const VIEWS = [
  { id: "overview", index: "01", label: "概览", blurb: "人物、关系、事件和章节从这里连在一起。" },
  { id: "characters", index: "02", label: "人物", blurb: "人物档案是关系图和章节引用的来源。" },
  { id: "graph", index: "03", label: "关系图", blurb: "拖动节点只改变布局。布局与人物资料分开保存。" },
  { id: "arcs", index: "04", label: "故事线", blurb: "故事线排列事件的叙事顺序，不改写事件本身。" },
  { id: "timeline", index: "05", label: "时间线", blurb: "这里按故事内顺序排列。它不必和章节顺序相同。" },
  { id: "chapters", index: "06", label: "章节", blurb: "正文按 Markdown 原文保存，右侧是预览。" },
  { id: "notes", index: "07", label: "笔记", blurb: "保存灵感、思考和未尽事宜。" },
  { id: "settings", index: "08", label: "设置", blurb: "主题、快照和插件都留在这台电脑上。" },
] as const

export type ViewId = (typeof VIEWS)[number]["id"]
