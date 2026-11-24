# API

> 版本：v1.0  
> 更新日期：2026-10-18  
> 桌面版 MVP 的本机命令。字段见 [数据模型](./DataModel.md)，失败见 [错误码](./Errors.md)

这些命令不是 HTTP 接口。界面调用 Tauri 命令，由同一进程里的 Rust 执行。信封不变。页面只依赖仓库接口，不自己拼 SQL。

命令名使用下面的蛇形名称。参数和返回值使用驼峰 JSON。

## 返回

调用方始终拿到同一个信封。下面各表的「成功时」指信封里的 `data`。失败时 `error` 用 [错误码](./Errors.md)，不附带半份对象。

```ts
type CommandResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };
```

列表用数组。没有记录时返回空数组，不返回 `NOT_FOUND`。按 id 读取或修改一个已经不存在的对象，才返回 `NOT_FOUND`。

界面在输入停止约 0.8 秒后调用对应的更新命令。连续输入合并成一次调用。顶栏只在 `ok: true` 之后更新保存时间。

## 共享类型

```ts
type Id = string;

interface Character {
  id: Id;
  name: string;
  aliases: string[];
  role: string;
  appearance: string;
  personality: string;
  goal: string;
  background: string;
  notes: string;
  status: "在场" | "离场" | "下落不明";
  createdAt: string;
  updatedAt: string;
}

interface Relation {
  id: Id;
  sourceId: Id;
  targetId: Id;
  type: "亲属" | "师徒" | "恋爱" | "合作" | "敌对" | "利用" | "同门" | "旧识" | "未知";
  description: string;
  directional: boolean;
  span: "当前" | "过去" | "未知";
  createdAt: string;
  updatedAt: string;
}

interface EventParticipant {
  characterId: Id;
  role: string;
}

interface StoryEvent {
  id: Id;
  title: string;
  description: string;
  storyTime: string | null;
  sortOrder: number;
  participants: EventParticipant[];
  createdAt: string;
  updatedAt: string;
}

interface StoryArc {
  id: Id;
  title: string;
  kind: "主线" | "支线" | "人物线" | "感情线";
  summary: string;
  sortOrder: number;
  eventIds: Id[];
  createdAt: string;
  updatedAt: string;
}

interface Chapter {
  id: Id;
  title: string;
  status: "构思中" | "草稿" | "修订中" | "完成";
  summary: string;
  content: string;
  sortOrder: number;
  characterIds: Id[];
  eventIds: Id[];
  createdAt: string;
  updatedAt: string;
}

interface Scene {
  id: Id;
  chapterId: Id;
  title: string;
  summary: string;
  storyTime: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

interface Note {
  id: Id;
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface GraphLayout {
  viewport: { x: number; y: number; zoom: number };
  nodes: Record<Id, { x: number; y: number }>;
  updatedAt: string;
}

interface ProjectSummary {
  id: Id;
  name: string;
  description: string;
  path: string;
  updatedAt: string;
  lastOpenedAt: string;
}
```

`path` 只出现在项目摘要和设置里。它是作者要找的项目文件，不写进普通错误信息。

创建类命令的名称类字段必填，其余字段可以省略，省略时用空字符串、空数组或数据模型里的默认值。服务端生成 `id` 和时间，调用方传入的 `id` 一律忽略。

## 应用

主题和最近项目存在应用库，不进小说文件。

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `app_get_state` | 无 | `{ theme: "paper" \| "ink", recent: ProjectSummary[], recovery: { needed: boolean, projectId: string \| null, snapshotAt: string \| null } }` |
| `app_set_theme` | `{ theme }` | `{ theme }` |
| `app_dismiss_recovery` | `{ projectId, snapshotAt }` | `{ dismissed: true }` |
| `plugin_list` | 无 | `{ id: string, name: string }[]` |

`recovery.needed` 为真时，界面询问是否恢复 `projectId` 的这份 `snapshotAt`。作者拒绝则调用 `app_dismiss_recovery`，同一份快照不再重复询问。`plugin_list` 只返回已经注册的进程内插件名称。

## 项目

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `project_list` | 无 | `ProjectSummary[]`，最近打开的在前 |
| `project_create` | `{ name, description? }` | `ProjectSummary` |
| `project_open` | `{ id }` | `ProjectSummary` |
| `project_update` | `{ id, name?, description? }` | `ProjectSummary` |
| `project_close` | `{ id }` | `{ closed: true }` |

`project_create` 的名称为空白时返回 `VALIDATION_ERROR` / `EMPTY_NAME`。

## 人物

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `character_list` | `{ projectId }` | `Character[]` |
| `character_create` | `{ projectId, name, ...部分字段 }` | `Character` |
| `character_update` | `{ projectId, id, ...要改的字段 }` | `Character` |
| `character_delete` | `{ projectId, id }` | `{ deletedId }` |

删除会去掉这个人的关系，并把他从事件参与者和章节出场名单里移除。事件、章节、笔记保留。

## 关系与布局

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `relation_list` | `{ projectId }` | `Relation[]` |
| `relation_create` | `{ projectId, sourceId, targetId, type, description?, directional?, span? }` | `Relation` |
| `relation_update` | `{ projectId, id, ...要改的字段 }` | `Relation` |
| `relation_delete` | `{ projectId, id }` | `{ deletedId }` |
| `graph_layout_get` | `{ projectId }` | `GraphLayout` |
| `graph_layout_save` | `{ projectId, viewport, nodes }` | `GraphLayout` |

`sourceId` 与 `targetId` 相同返回 `SELF_RELATION`。任一端不是当前项目的人物，返回 `NOT_FOUND`。隐藏某类关系只发生在界面，不调用删除。

`graph_layout_save` 可以只带移动过的节点。未出现在 `nodes` 里的已有坐标保留。

## 事件、故事线、时间线

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `event_list` | `{ projectId }` | `StoryEvent[]`，按 `sortOrder` |
| `event_create` | `{ projectId, title, description?, storyTime?, participants? }` | `StoryEvent` |
| `event_update` | `{ projectId, id, ...要改的字段 }` | `StoryEvent` |
| `event_delete` | `{ projectId, id }` | `{ deletedId }` |
| `event_reorder` | `{ projectId, ids: Id[] }` | `StoryEvent[]` |
| `story_arc_list` | `{ projectId }` | `StoryArc[]` |
| `story_arc_create` | `{ projectId, title, kind?, summary? }` | `StoryArc` |
| `story_arc_update` | `{ projectId, id, title?, kind?, summary? }` | `StoryArc` |
| `story_arc_delete` | `{ projectId, id }` | `{ deletedId }` |
| `story_arc_set_events` | `{ projectId, id, eventIds: Id[] }` | `StoryArc` |

`event_reorder` 的 `ids` 必须是当前项目事件 id 的一个排列，否则返回 `VALIDATION_ERROR`。调整一条故事线的 `eventIds` 不改变事件自己的 `sortOrder`，也不改变其他故事线。

`event_delete` 会从故事线和章节引用中去掉该事件。`story_arc_delete` 不删除事件。

时间线不单独设命令。界面用 `event_list` 的顺序，再根据章节引用算出「首次叙述于哪一章」。

## 章节、场景、笔记

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `chapter_list` | `{ projectId }` | `Chapter[]`，按 `sortOrder` |
| `chapter_create` | `{ projectId, title, status?, summary?, content? }` | `Chapter` |
| `chapter_update` | `{ projectId, id, ...要改的字段 }` | `Chapter` |
| `chapter_delete` | `{ projectId, id }` | `{ deletedId }` |
| `chapter_reorder` | `{ projectId, ids: Id[] }` | `Chapter[]` |
| `scene_list` | `{ projectId, chapterId }` | `Scene[]` |
| `scene_create` | `{ projectId, chapterId, title, summary?, storyTime? }` | `Scene` |
| `scene_update` | `{ projectId, id, ...要改的字段 }` | `Scene` |
| `scene_delete` | `{ projectId, id }` | `{ deletedId }` |
| `note_list` | `{ projectId }` | `Note[]` |
| `note_create` | `{ projectId, title, content?, tags? }` | `Note` |
| `note_update` | `{ projectId, id, ...要改的字段 }` | `Note` |
| `note_delete` | `{ projectId, id }` | `{ deletedId }` |

`chapter_update` 的 `content` 保存 Markdown 原文。`characterIds` 与 `eventIds` 整体替换该章节的关联。

## 搜索与快照

| 命令 | 参数 | 成功时 |
| --- | --- | --- |
| `search_query` | `{ projectId, query }` | `SearchHit[]` |
| `backup_create` | `{ projectId }` | `{ snapshotAt, path }` |
| `backup_list` | `{ projectId }` | `{ snapshotAt, path }[]`，新的在前，最多 10 条 |
| `backup_restore` | `{ projectId, snapshotAt }` | `ProjectSummary` |

```ts
interface SearchHit {
  kind: "character" | "event" | "arc" | "chapter" | "note";
  id: Id;
  title: string;
}
```

搜索匹配人物姓名与别名，以及事件、故事线、章节、笔记的标题和正文。空白查询返回空数组。搜索在本机完成。

`backup_restore` 会先为当前库再做一份快照，然后用选中的快照替换项目库。校验失败时返回 `BACKUP_ERROR` 或 `IMPORT_ERROR`，当前库不变。

导入导出是下一批命令，不在页面第一段实现：

| 命令 | 作用 |
| --- | --- |
| `project_export` | 写出 JSON 项目包，或可读的 Markdown |
| `project_import_preview` | 只校验并返回将要写入的摘要 |
| `project_import_commit` | 作者确认后才写入。确认前先做快照 |

本阶段没有模型命令。不预留会把正文发出去的调用。
