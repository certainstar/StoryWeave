# StoryWeave（墨织）技术规划文档

> 版本：v1.0  
> 文档状态：规划稿  
> 项目定位：开源、单机的小说构思与创作软件。当前推出桌面版，移动端以后再评估  
> 暂定项目名：**StoryWeave**，中文名 **墨织**  
> 一句话介绍：把人物、关系、事件、时间线与章节脉络编织在一起，让长篇故事可视化、可追踪、可持续创作。

---

## 1. 项目概述

### 1.1 项目愿景

StoryWeave 是一款面向小说作者的开源软件，帮助作者在正式写作前后整理创意、构建人物档案、梳理人物关系、组织故事线与时间线，并在后续版本中通过 AI 辅助提取设定、发现矛盾和整理剧情。当前推出的是桌面版。

软件按单机来做：不建立账号，也不在开发者的服务器上保存用户信息或小说正文。产品的核心是把小说中的**人物、关系、事件、场景、章节、故事线和时间信息**连接成可浏览、可编辑、可追踪的结构化工作区。作者若要多端互通，可以导入项目文件、连接自己的远端仓库，或自行配置；这些通路可以接到插件槽上。移动端留到桌面版之后再评估。

### 1.2 产品原则

1. **单机可用**：小说资料默认留在本机。软件不保存用户账号或个人资料，打开项目不依赖开发者的服务器。
2. **用户拥有数据**：支持导出、备份和导入。多端互通由作者导入文件、为自己的远端仓库鉴权，或通过插件槽自行配置。
3. **结构化但不束缚创作**：既能维护人物、事件等结构化数据，也保留自由笔记和正文编辑能力。
4. **图谱是工作工具，不是装饰**：关系图和故事线应能跳转到相关人物、事件、章节和笔记。
5. **AI 可选且透明**：核心功能不依赖 AI；用户可以选择远程模型或本地模型，并明确知道哪些内容会被发送出去。
6. **先做可靠 MVP**：优先解决数据模型、编辑体验和数据安全，不在第一版引入复杂服务端架构。



### 1.3 目标用户

- 正在构思长篇小说、系列小说或复杂世界观的个人作者。
- 需要维护大量角色、阵营、地点和设定的创作者。
- 需要追踪多条故事线、时间顺序、伏笔和人物动机的作者。
- 希望在本机管理创作资料、并能导出为通用格式的用户。



### 1.4 非目标（第一阶段）

- 墨织自己的账号、用户信息存储、订阅、团队权限和内容社区。
- 由墨织托管的云同步。多端互通交给作者的项目文件、远端仓库或插件槽。
- 把第一版做成移动端。当前只发布桌面应用。
- 替代专业排版软件或出版流程。
- 让 AI 自动决定故事走向或未经确认直接改写正文。
- 依赖远程服务才能打开项目。

---



## 2. 产品范围与版本规划



### 2.1 MVP 必须具备的能力


| 模块    | MVP 能力                            | 优先级      |
| ----- | --------------------------------- | -------- |
| 项目管理  | 创建、打开、重命名、关闭项目；最近项目列表             | P0       |
| 人物档案  | 人物增删改查、别名、身份、外貌、性格、目标、背景、备注       | P0       |
| 人物关系图 | 节点拖拽、关系连线、关系类型、节点详情、自动保存          | P0       |
| 故事线   | 创建故事线、排列故事节点、关联人物和事件              | P0       |
| 时间线   | 事件日期/相对时间、排序、事件详情                 | P0       |
| 笔记与正文 | Markdown 编辑、预览、章节/场景基础管理          | P0       |
| 全局搜索  | 搜索人物、事件、章节和笔记标题/内容                | P0       |
| 数据安全  | 自动保存、备份、导出、异常退出后的恢复策略             | P0       |
| 导入导出  | Markdown、JSON 项目导出；基础 Markdown 导入 | P1       |
| AI 辅助 | 从文本提取人物/关系/事件的候选项，用户确认后写入         | P1       |
| 一致性检查 | 对人物设定、事件顺序和引用关系进行规则检查             | P2       |
| 插件槽    | 预留扩展点，供作者自行接入远端仓库或同步配置     | 暂不纳入 MVP |




### 2.2 版本里程碑



#### M0：技术验证

目标：确认桌面应用、数据库、关系图和编辑器的关键技术可以协同工作。

- 创建 Tauri 2 + Vue 3 + TypeScript 项目。
- 完成桌面窗口、应用菜单和基本布局。
- 连接 SQLite，完成迁移机制。
- 使用 Vue Flow 实现可拖拽节点和连线。
- 实现人物列表与人物详情的最小闭环。
- 验证 macOS 构建；同步评估 Windows 构建。

**验收标准：** 可以创建一个项目，新增人物，在图谱中展示并建立关系，关闭后重新打开仍保留数据。

#### M1：MVP

- 项目管理、人物管理、关系图。
- 故事线、事件时间线。
- Markdown 笔记与章节/场景管理。
- 全局搜索、自动保存、备份与导出。
- 基本设置、主题和快捷键。

**验收标准：** 用户可以不联网完成一个小型小说项目的构思、资料整理与章节规划。

#### M2：AI 辅助

- AI Provider 抽象层。
- 从文本中提取人物、地点、组织、关系和事件。
- 候选结果预览、差异确认和批量写入。
- 支持远程模型 API；评估 Ollama/OpenAI-compatible 本地服务。
- 提供明确的数据发送提示与隐私设置。

**验收标准：** AI 输出不会未经用户确认直接覆盖既有设定；失败时核心功能仍可用。

#### M3：创作效率与稳定性

- 人物设定一致性检查。
- 伏笔、线索与回收状态。
- 关系图过滤、分组、局部图和布局优化。
- 更完善的导入导出、版本备份与恢复。
- Windows/macOS 发布自动化、崩溃日志和升级流程。



#### M4：插件槽与作者自己的远端

- 插件槽。插件只在作者安装并配置后运行，第一版不依赖插件就能写作。
- 作者为自己的远端仓库鉴权，凭据留在本机，不进入墨织的用户库。
- 可选的项目加密/敏感内容保护。
- 用户自定义字段、关系类型、故事结构模板。

桌面版稳定之后再评估移动端。移动端沿用同一套项目文件，仍然不代管用户信息。

---



## 3. 技术选型



### 3.1 推荐技术栈


| 层次           | 选型                                      | 用途                           | 选择理由                                             |
| ------------ | --------------------------------------- | ---------------------------- | ------------------------------------------------ |
| 桌面容器         | **Tauri 2**                             | 打包为 macOS/Windows/Linux 桌面应用 | 体积较轻，前端可复用 Web 技术                                |
| 桌面原生层        | **Rust**                                | 文件系统、窗口、系统集成、受控命令            | 与 Tauri 原生集成；只在必要位置编写 Rust                       |
| 前端框架         | **Vue 3**                               | 页面与组件                        | 适合组件化开发，生态成熟                                     |
| 语言           | **TypeScript**                          | 前端类型系统                       | 降低复杂数据模型和重构风险                                    |
| 构建工具         | **Vite**                                | 开发服务器和前端构建                   | Vue 生态默认选择之一                                     |
| 状态管理         | **Pinia**                               | 项目状态、UI 状态、编辑状态              | 易于拆分模块，TypeScript 支持好                            |
| 关系图          | **Vue Flow**                            | 人物关系、事件依赖、故事线节点              | 支持自定义节点、边和交互                                     |
| Markdown 编辑器 | **CodeMirror 6**                          | 正文和笔记的原文编辑与预览             | 已定为原文优先；不并行实现所见即所得                         |
| UI 样式        | **Tailwind CSS** 或 CSS Variables + 组件规范 | 布局、主题和样式                     | 可选其一，不必同时引入大量 UI 框架                              |
| 本地数据库        | **SQLite**                              | 项目元数据、人物、关系、事件等              | 单文件、事务可靠、无需单独服务                                  |
| 数据访问         | Tauri SQLite 插件或 Rust 数据访问层             | 数据读写、迁移                      | 将 SQL 与业务逻辑集中管理                                  |
| 数据校验         | **Zod**（前端）+ Rust 侧校验                   | 校验导入数据和命令参数                  | 避免不可信数据进入核心模型                                    |
| 测试           | Vitest、Vue Test Utils、Playwright（按需）    | 单元、组件和端到端测试                  | 覆盖核心交互和数据持久化                                     |
| 代码规范         | ESLint、Prettier、Rustfmt、Clippy          | 统一风格与静态检查                    | 降低协作成本                                           |
| CI           | GitHub Actions                          | 测试、构建、发布                     | 适合开源仓库自动化                                        |




### 3.2 是否需要 Go 后端？

**第一版不需要额外的 Go/FastAPI 后端。**

建议先采用：

```text
Vue 3 + TypeScript
        │
        ▼
      Tauri 2
        │
        ▼
    Rust 命令层
        │
        ├── SQLite
        ├── 本地文件读写
        └── 系统能力
```

原因：

- 应用以单机使用为主，不需要服务端 API。
- 多一个本地服务会增加启动、端口、进程管理和打包复杂度。
- Tauri 的 Rust 层可以直接处理本地数据库和文件操作。

未来如果出现明确需求，可以再引入独立的 Go 服务，例如需要复用已有 Go 分析库、运行长期后台任务或提供本地 HTTP API。不要为了“前后端分离”而预先引入服务。

### 3.3 编辑器选型建议

- **Tiptap**：适合需要标题、粗体、引用、清单、链接、扩展节点等富文本能力的正文编辑器。
- **CodeMirror 6**：适合 Markdown 原文编辑、快捷键、语法高亮和键盘工作流。
- **简单 Markdown 编辑器**：适合 MVP 先快速实现输入与预览。

产品需求已经选定：正文用 Markdown 原文编辑，并排预览，实现用 CodeMirror 6。不并行做一套所见即所得。

---



## 4. 系统架构



### 4.1 总体架构

```text
┌──────────────────────────────────────────────────┐
│                    Vue 3 UI                      │
│                                                  │
│  项目管理  人物档案  关系图  故事线  时间线  编辑器 │
│       │         │       │       │       │        │
│       └─────────┴───────┴───────┴───────┘        │
│                         │                        │
│              Pinia / Domain Services             │
│                         │                        │
│          Repository / Tauri Invoke API           │
└─────────────────────────┬────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────┐
│                   Tauri 2 / Rust                 │
│                                                  │
│  命令校验  业务服务  文件导入导出  备份/恢复       │
│                         │                        │
│                   SQLite Repository              │
└─────────────────────────┬────────────────────────┘
                          │
             ┌────────────┴────────────┐
             ▼                         ▼
       SQLite 项目数据库          Markdown / JSON
```

AI 能力以可选模块接入：

```text
AI UI / AI Service
        │
        ▼
   AI Provider 接口
        │
   ┌────┴─────────────┐
   ▼                  ▼
远程模型 API       本地模型服务
                    （可选）
```



### 4.2 分层职责



#### UI 层

- 负责页面、交互、表单、图谱呈现和用户反馈。
- 不直接拼接 SQL。
- 不在组件中散落复杂业务规则。
- 图谱节点的坐标、缩放、筛选等视图状态与核心人物/关系数据分开管理。



#### Domain / Service 层

- 负责人物关系校验、事件关联、故事线排序等业务规则。
- 尽量写成可独立测试的 TypeScript 函数或服务。
- 业务规则不应依赖具体 UI 组件。



#### Repository 层

- 封装人物、关系、事件、章节等数据的增删改查。
- 页面只通过统一接口访问数据。
- 未来替换存储方案或添加导入导出时，减少 UI 变更。



#### Tauri / Rust 层

- 负责受控的文件系统访问、SQLite 访问、备份、系统菜单等。
- 对命令输入做校验。
- 只开放必要的 Tauri commands 和 capabilities。
- 避免将任意文件路径或任意 SQL 暴露给前端调用。



### 4.3 关键架构决策

1. **数据库作为结构化数据的权威来源**；图谱是结构化数据的视图，不是唯一数据源。
2. **正文内容采用 Markdown 文件或数据库文本字段**，在 MVP 阶段选定一种主要存储方式，避免双向同步混乱。
3. **节点位置属于视图数据**，与人物的事实信息分离。
4. 所有关键写操作都应具备事务或失败回滚策略。
5. 数据迁移必须有版本号，升级前自动备份。
6. AI 输出先进入候选/草稿状态，经用户确认后再写入正式数据。

---



## 5. 数据模型设计



### 5.1 核心实体


| 实体               | 说明         | 主要字段                                                                   |
| ---------------- | ---------- | ---------------------------------------------------------------------- |
| Project          | 小说项目       | id、name、description、created_at、updated_at                              |
| Character        | 人物         | id、project_id、name、aliases、role、profile、status                         |
| Relation         | 人物/实体关系    | id、project_id、source_id、target_id、type、description、valid_from、valid_to |
| StoryArc         | 故事线/剧情弧    | id、project_id、title、description、status、sort_order                      |
| Event            | 故事事件       | id、project_id、title、description、story_time、sort_order                  |
| EventParticipant | 事件参与者      | event_id、entity_id、role                                                |
| Chapter          | 章节         | id、project_id、title、content_ref、sort_order、status                      |
| Scene            | 场景         | id、chapter_id、title、summary、sort_order、story_time                      |
| ArcEvent         | 故事线与事件关联   | arc_id、event_id、sort_order                                             |
| Note             | 灵感和设定笔记    | id、project_id、title、content、tags                                       |
| Entity           | 通用实体（后续可选） | id、project_id、type、name、attributes                                     |
| GraphLayout      | 图谱布局       | id、project_id、view_id、node_positions、viewport                          |
| Tag              | 标签（后续可选）   | id、project_id、name                                                     |
| EntityTag        | 实体标签关联     | entity_id、tag_id                                                       |




### 5.2 人物关系建模

关系不应只保存为一条显示连线，还应支持语义：

- `source_id`：关系起点。
- `target_id`：关系终点。
- `type`：关系类型，例如亲属、师徒、恋爱、合作、敌对、利用、未知。
- `description`：关系补充说明。
- `is_directional`：是否有方向性。
- `valid_from` / `valid_to`：关系在故事世界中的生效区间（可选）。
- `status`：当前、过去、隐藏、待确认等（可选）。

需注意：**“A 认为 B 是敌人”与“双方互为敌人”可能并不等价**。数据模型应允许有向关系；UI 可根据关系类型决定默认呈现方式。

### 5.3 SQLite 设计原则

- 主键使用 UUID/ULID 字符串，方便导入导出和跨项目迁移。
- 关键表包含 `project_id`，避免跨项目串数据。
- 对常用过滤字段建立索引。
- 外键约束默认开启。
- 删除人物时，对关系和引用采用明确策略：阻止删除、级联删除或软删除，不能含糊处理。
- `created_at`、`updated_at` 使用统一格式存储，推荐 UTC ISO 8601 或整数时间戳。
- SQLite 数据库版本通过 `schema_version` 或迁移表管理。



### 5.4 建议的初始表结构

以下为概念示例，实际字段需在开发中通过迁移脚本维护：

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    name TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    role TEXT NOT NULL DEFAULT '',
    profile_json TEXT NOT NULL DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_characters_project_name
    ON characters(project_id, name);

CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_directional INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (source_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES characters(id) ON DELETE CASCADE,
    CHECK (source_id <> target_id)
);

CREATE INDEX idx_relations_project_source
    ON relations(project_id, source_id);
CREATE INDEX idx_relations_project_target
    ON relations(project_id, target_id);

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    story_time TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE story_arcs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE arc_events (
    arc_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (arc_id, event_id),
    FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);
```

> 注意：如果后续要支持地点、组织、物品等通用实体，建议将 `relations` 扩展为 `source_entity_id` / `target_entity_id`，或增加统一 `entities` 表；不要在 MVP 尚未验证需求前过度泛化。

---



## 6. 前端应用结构与页面规划



### 6.1 主界面布局

建议采用三栏式桌面工作台：

```text
┌──────────────────────────────────────────────────────────┐
│ 顶栏：项目名称 / 全局搜索 / 撤销重做 / 设置 / 保存状态    │
├────────────┬───────────────────────────┬─────────────────┤
│ 左侧导航   │ 主工作区                  │ 右侧详情面板    │
│            │                           │                 │
│ 项目概览   │ 关系图 / 时间线 / 编辑器  │ 当前选中对象    │
│ 人物       │ 故事线 / 章节列表         │ 属性 / 备注     │
│ 关系图     │                           │ 关联内容        │
│ 故事线     │                           │                 │
│ 时间线     │                           │                 │
│ 章节与场景 │                           │                 │
│ 笔记       │                           │                 │
└────────────┴───────────────────────────┴─────────────────┘
```



### 6.2 页面说明



#### 项目概览

- 项目简介、最近编辑、人物数量、未完成事件。
- 快速入口：新增人物、新增事件、新建章节。
- 最近操作与数据备份状态。



#### 人物管理

- 人物列表、搜索、标签和筛选。
- 人物详情：基础信息、目标、动机、背景、性格、外观、秘密、人物弧光。
- 关联关系、参与事件、出场章节。
- 支持自定义字段可放到后续版本。



#### 人物关系图

- 自定义人物节点和关系边。
- 拖动、缩放、框选、搜索定位、过滤关系类型。
- 点击节点打开详情面板；双击进入人物页。
- 右键或快捷菜单新增人物/关系。
- 保存布局、重置布局、导出图片（后续）。
- 大图谱提供局部视图、隐藏非相关节点和按阵营分组。



#### 故事线

- 创建主线、支线、人物线、感情线等剧情弧。
- 用节点或卡片表示关键事件。
- 事件可关联人物、章节和场景。
- 支持调整顺序、标记状态、显示未回收伏笔（后续）。



#### 时间线

- 按故事内时间或叙述顺序查看事件。
- 支持日期、相对时间、未知时间。
- 明确区分“故事世界时间”与“章节发布/写作顺序”。
- 允许非线性叙事，不强制事件顺序与章节顺序一致。



#### 章节与场景

- 章节目录、场景列表、摘要和正文。
- 章节状态：构思中、草稿、修订中、完成。
- 章节中关联出场人物和事件。
- 支持大纲视图与正文视图切换。



#### 笔记与世界观

- 自由笔记、设定集、地点、组织和规则。
- 支持标签、双向链接（后续）。
- 可以将笔记中的实体转换为正式人物/事件。



### 6.3 前端目录建议

```text
src/
├── app/
│   ├── App.vue
│   ├── router.ts
│   └── providers/
├── assets/
├── components/
│   ├── common/
│   ├── layout/
│   ├── character/
│   ├── graph/
│   ├── timeline/
│   ├── story-arc/
│   └── editor/
├── features/
│   ├── projects/
│   ├── characters/
│   ├── relations/
│   ├── events/
│   ├── story-arcs/
│   ├── chapters/
│   ├── notes/
│   ├── search/
│   └── settings/
├── domain/
│   ├── models/
│   ├── services/
│   └── validators/
├── repositories/
├── stores/
├── composables/
├── lib/
├── styles/
└── main.ts
```

原则：按业务功能组织代码；避免把所有组件都放进一个巨大的 `components` 目录，也避免在早期把简单功能拆成大量抽象层。

---



## 7. Tauri / Rust 层规划



### 7.1 Rust 层职责

- SQLite 连接与迁移。
- 项目目录初始化。
- 文件导入、导出和备份。
- 系统菜单、快捷键、打开文件等桌面集成。
- 受控的 AI 请求代理（如确有需要）。
- 对前端传入参数进行校验。



### 7.2 命令设计原则

命令按业务划分，命名清晰，不暴露任意 SQL：

```text
project_list
project_create
project_open
project_update
project_export
project_backup

character_list
character_create
character_update
character_delete

relation_list
relation_create
relation_update
relation_delete

event_list
event_create
event_update
event_delete

story_arc_list
story_arc_create
story_arc_update
story_arc_delete

search_query
backup_restore
```

这些是逻辑命令名示例，不是必须逐字照搬的 API。实际实现时应统一错误码、参数结构和返回结构。

### 7.3 错误处理

统一返回可识别错误，例如：

- `VALIDATION_ERROR`：输入校验失败。
- `NOT_FOUND`：对象不存在。
- `CONFLICT`：版本或唯一性冲突。
- `STORAGE_ERROR`：数据库/文件读写失败。
- `IMPORT_ERROR`：导入文件格式错误。
- `AI_PROVIDER_ERROR`：模型请求失败。

用户界面展示可理解的错误信息；开发模式保留详细日志。不要把本地文件绝对路径、API Key 或完整正文写入普通日志。

---



## 8. 数据存储、备份与导入导出



### 8.1 数据存储策略

建议采用以下原则：

- SQLite 保存项目元数据、人物、关系、事件、章节结构和应用配置。
- 正文可以先保存为 SQLite 文本字段，也可以采用项目目录内 Markdown 文件。两种方式各有优缺点，MVP 应选定一个主方案。
- 若使用 Markdown 文件，SQLite 中保存文件相对路径；文件读写必须限制在项目根目录内，避免路径穿越。
- 图谱布局和筛选视图作为独立视图数据保存，不应污染人物业务字段。

**建议的 MVP 默认方案：** 结构化数据保存在 SQLite，正文和长笔记也先保存在 SQLite；提供 Markdown/JSON 导出。这样能减少文件与数据库双写不一致问题。后续如果用户明确需要在文件管理器和其他编辑器中直接编辑，再增加 Markdown 文件夹项目模式。

### 8.2 备份策略

- 每次应用启动时检查上次退出是否正常。
- 对重要写操作采用事务。
- 定期或按操作次数创建数据库快照。
- 覆盖式导入/恢复前自动生成备份。
- 备份文件保留策略可配置，例如最近 10 份或最近 30 天。
- 恢复前校验数据库版本和完整性。
- 在 UI 明确显示最近备份时间和备份位置。

SQLite 可利用其备份 API 或一致性快照机制；不要在数据库写入过程中简单复制主数据库文件而忽略 WAL 文件。

### 8.3 导入导出格式


| 格式       | 用途              | 规划     |
| -------- | --------------- | ------ |
| JSON 项目包 | 完整结构化迁移         | MVP/P1 |
| Markdown | 正文和笔记的可读性迁移     | P1     |
| CSV      | 人物、事件列表导出       | P2     |
| PNG/SVG  | 关系图导出           | P2     |
| ZIP 项目包  | 包含数据库、正文、资源和元数据 | P1/P2  |


导入流程应包括：读取文件、校验版本、预览变更、处理 ID 冲突、确认写入、失败回滚。导入不得静默覆盖当前项目。

---



## 9. AI 辅助架构



### 9.1 设计原则

- AI 是可选增强功能，离线时主功能仍可用。
- 默认不自动覆盖现有数据。
- 用户可以选择模型提供方。
- 发送远程模型前，清晰说明会发送哪些文本。
- API Key 使用系统安全存储能力或受保护的本地配置，不写入项目导出文件。
- 对模型输出进行 schema 校验，并将其视为不可信输入。



### 9.2 Provider 抽象

```ts
export interface AIProvider {
  id: string;
  displayName: string;
  generate(input: AIRequest): Promise<AIResponse>;
}

export interface AIRequest {
  task: "extract_entities" | "extract_relations" | "summarize" | "consistency_check";
  content: string;
  context?: Record<string, unknown>;
}

export interface AIResponse {
  content: string;
  model?: string;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
  };
}
```

实际实现还应加入超时、取消、重试策略、错误分类和敏感信息处理。

### 9.3 AI 功能路线



#### P1：结构化提取

用户选中一段文本后，AI 返回候选数据：

```json
{
  "characters": [
    {
      "name": "林默",
      "description": "来自北境的年轻剑士"
    }
  ],
  "relations": [
    {
      "source": "林默",
      "target": "李玄",
      "type": "师徒",
      "confidence": 0.91
    }
  ],
  "events": [
    {
      "title": "林默拜李玄为师",
      "participants": ["林默", "李玄"]
    }
  ]
}
```

UI 展示候选项、置信度和来源文本；用户确认后再创建或更新实体。

#### P2：一致性检查

- 人物年龄、称谓、外貌、能力等设定冲突。
- 人物在不同章节中的状态冲突。
- 事件时间顺序异常。
- 已标记为“待回收”的伏笔长期未处理。
- 同名人物、别名和重复事件提示。

AI 只能给出“疑似矛盾”和依据，不应直接判定作者设定错误。

### 9.4 本地模型支持

可通过 Ollama 或兼容 OpenAI API 的本地模型服务接入。需要区分：

- **应用本地运行**：界面、数据库和项目数据都在本机。
- **模型本地运行**：推理也在本机，数据不必发往远程模型服务。
- **远程模型调用**：请求内容会离开本机，必须有明确提示和用户授权。

单机运行不等于模型推理也在本机。远程模型会把选中的文本送出本机，必须单独说明。

---



## 10. 安全与隐私

1. 不保存用户账号或个人资料，默认不上传小说内容，不收集遥测。作者自行连接的远端仓库、插件或模型，只发送作者明确授权的内容。如未来添加匿名统计，必须可关闭并明确告知。
2. API Key 不写入日志、截图、导出包或版本库。
3. Tauri capabilities 采用最小权限原则，只允许必要的文件系统和系统能力。
4. 所有导入文件均需校验大小、格式、字段和版本。
5. 文件导入导出防止路径穿越和覆盖系统文件。
6. AI 返回内容必须校验，不能直接执行其中的代码、SQL 或文件操作。
7. 错误日志默认避免记录正文全文。
8. 可选加密应明确威胁模型；数据库加密不等于防止已登录系统上的恶意软件读取内容。
9. 依赖库定期更新，并通过自动化依赖检查发现已知漏洞。

---



## 11. 性能与可靠性目标

MVP 目标以个人小说项目为基准，后续根据真实数据调整：

- 应用冷启动：普通开发机器上目标为数秒级。
- 普通人物/事件增删改查：交互无明显卡顿。
- 数百个节点的关系图：支持基本拖拽、缩放和筛选。
- 大型图谱（数千节点）不作为 MVP 性能承诺；需采用局部视图、过滤和按需加载。
- 自动保存不得频繁阻塞编辑器输入。
- 数据库写入应使用事务，并对重复保存做合并/防抖。
- 任何导入失败不得造成原项目数据损坏。
- 异常退出后，尽量恢复到最近一次成功保存状态。

---



## 12. 测试策略



### 12.1 单元测试

- 数据校验与领域规则。
- 关系类型、方向和自关系校验。
- 故事线排序与事件排序。
- 导入数据版本转换。
- 搜索和过滤逻辑。



### 12.2 集成测试

- SQLite 迁移、事务和外键约束。
- Repository 的 CRUD。
- 导入/导出往返一致性。
- 备份与恢复。
- Rust commands 的输入错误和数据库错误。



### 12.3 UI / E2E 测试

关键流程：

1. 新建项目。
2. 新增人物 A、人物 B。
3. 创建人物关系。
4. 调整图谱布局并重启应用，验证布局保存。
5. 新建事件并关联人物。
6. 新建章节并保存正文。
7. 导出项目，再导入到新项目并核对数据。
8. AI 提取候选关系，取消确认后检查数据库未发生变更。



### 12.4 发布前检查

- macOS 与 Windows 至少完成一次真实安装测试。
- 无项目时可正常启动。
- 数据库迁移失败时有备份和清晰提示。
- 无网络环境下核心功能可用。
- 导入异常文件不会导致崩溃或数据覆盖。
- 开发者模式关闭后不暴露调试接口。

---



## 13. 开源仓库与工程规范



### 13.1 仓库结构

应用还没有初始化。这一阶段仓库只放需求、原型和开源说明，不预建空的 `src/` 或 `src-tauri/`，以免和以后的 Tauri 脚手架冲突。也不使用 `Backend/`、`Frontend/` 这种前后端分仓目录：第一版没有独立后端。

```text
StoryWeave/
├── Docs/
│   ├── PRD.md
│   ├── OKR.md              # 本阶段目标，以及先写哪一页
│   ├── Planning.md
│   ├── TechStack.md        # 已定选型
│   ├── API.md              # 本机命令
│   ├── DataModel.md        # 项目库表结构
│   ├── Errors.md           # 错误码
│   ├── Privacy.md
│   └── assets/             # 产品图标与原型截图
├── Prototype/              # 可交互原型
├── Changelog/
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── SECURITY.md
├── LICENSE
└── README.md
```

桌面工程初始化之后，在仓库根目录补上这些目录，而不是另起一套后端服务：

```text
src/                        # Vue 前端
src-tauri/                  # Tauri / Rust
public/
scripts/
tests/
.github/workflows/
package.json
pnpm-lock.yaml
```



### 13.2 工具链

建议：

- Node.js：选择当前仍受支持的 LTS 版本，并在 `.nvmrc` 或 `.node-version` 中固定。
- 包管理器：pnpm。
- Rust：stable toolchain，提交 `rust-toolchain.toml`（如需固定工具链）。
- 前端格式化：Prettier。
- 前端静态检查：ESLint + `vue-tsc`。
- Rust 检查：`cargo fmt --check`、`cargo clippy`、`cargo test`。
- 提交前运行核心检查；CI 中执行相同命令。

具体版本应在仓库初始化时统一锁定，并在升级时通过 CI 验证，而不是在规划文档里长期写死可能过时的版本号。

### 13.3 Git 工作流

- `main`：始终保持可构建。
- 功能分支：`feat/character-profile`、`feat/relationship-graph`。
- 修复分支：`fix/sqlite-migration`。
- 每个 PR 应说明变更、测试结果和潜在数据迁移影响。
- 涉及数据库 schema 的 PR 必须附迁移脚本与回滚/兼容策略。



### 13.4 开源许可证

可选方案：

- **MIT**：宽松、使用门槛低，适合希望项目被广泛使用和二次开发。
- **Apache-2.0**：同样宽松，并明确包含专利授权条款。
- **GPL-3.0**：更强调衍生分发时保持相同开源许可。

若没有强烈的许可证偏好，个人桌面工具通常可以优先考虑 MIT 或 Apache-2.0。最终选择前应考虑对贡献者、依赖库和未来商业化的影响。

### 13.5 README 至少包含

- 项目简介与截图。
- 功能列表和路线图。
- 安装包下载与支持平台。
- 开发环境准备和本地运行方法。
- 构建、测试、打包命令。
- 数据存储位置与备份方法。
- AI 数据隐私说明。
- 贡献指南、许可证和安全问题反馈方式。

---



## 14. 里程碑与开发顺序

建议按依赖关系推进，不以页面数量作为唯一完成标准。

### 阶段 A：脚手架与数据底座

1. 初始化 Vue 3 + TypeScript + Vite。
2. 初始化 Tauri 2。
3. 配置 Pinia、路由、Lint 和格式化。
4. 建立 SQLite schema 与迁移。
5. 完成项目创建、打开和关闭。
6. 建立 Repository 与统一错误处理。

**交付物：** 可以创建项目并持久化项目元数据。

### 阶段 B：人物与关系图

1. 人物 CRUD。
2. 人物列表和详情。
3. Vue Flow 自定义节点。
4. 关系新增、编辑、删除。
5. 图谱布局持久化。
6. 删除人物时处理关系引用。
7. 为核心业务逻辑编写测试。

**交付物：** 可用的人物关系管理闭环。

### 阶段 C：事件、故事线与时间线

1. 事件 CRUD。
2. 事件与人物关联。
3. 故事线 CRUD。
4. 故事线与事件排序。
5. 时间线视图。
6. 章节与场景的基本结构。
7. 对故事时间和章节顺序进行分离建模。

**交付物：** 可以从人物关系扩展到剧情结构。

### 阶段 D：编辑器、搜索与数据安全

1. Markdown 编辑与预览。
2. 章节/场景内容管理。
3. 全局搜索。
4. 自动保存和保存状态提示。
5. 项目导出与导入。
6. 自动备份、恢复和完整性校验。
7. macOS/Windows 安装包验证。

**交付物：** 达到可公开发布的 MVP。

### 阶段 E：AI 辅助

1. 定义 AI Provider 接口。
2. 实现一个远程模型 Provider。
3. 设计结构化输出 schema。
4. 实现候选预览与人工确认。
5. 增加请求取消、超时和错误处理。
6. 增加隐私提示与模型配置。
7. 再评估本地模型 Provider。

**交付物：** AI 作为可选辅助工具，不影响基础创作工作流。

---



## 15. MVP 验收清单



### 基础能力

- [ ] 可以新建、打开、重命名和关闭项目。
- [ ] 重启应用后项目数据仍然存在。
- [ ] 可以创建、编辑、删除人物。
- [ ] 可以建立、编辑、删除人物关系。
- [ ] 可以拖动图谱节点并保存布局。
- [ ] 可以创建事件并关联人物。
- [ ] 可以创建故事线并调整事件顺序。
- [ ] 可以创建章节/场景并保存内容。
- [ ] 可以搜索人物、事件、章节和笔记。
- [ ] 可以导出项目并在另一份项目中导入。
- [ ] 导入失败时原项目不被破坏。
- [ ] 可以创建备份并恢复。
- [ ] 无网络时核心功能可正常使用。
- [ ] AI 不会未经确认修改既有数据。
- [ ] macOS 和 Windows 至少各完成一次安装与启动验证。



### 工程能力

- [ ] SQLite schema 有版本化迁移。
- [ ] 核心 Repository 和业务规则有测试。
- [ ] CI 执行前端检查、Rust 检查和测试。
- [ ] README、许可证、贡献指南和隐私说明齐全。
- [ ] 日志中不包含 API Key 和不必要的正文内容。

---



## 16. 主要风险与应对


| 风险                      | 影响          | 应对                         |
| ----------------------- | ----------- | -------------------------- |
| 过早做 AI，忽视核心数据体验         | 产品难以稳定使用    | 先完成结构化数据和图谱闭环              |
| 关系图节点过多导致卡顿             | 大型项目体验差     | 提供过滤、局部图、分组和按需显示           |
| SQLite 与 Markdown 双写不一致 | 内容丢失或版本冲突   | MVP 先确定单一权威存储方案            |
| 数据模型过度泛化                | 开发成本高、需求难验证 | 先以人物/关系/事件/故事线为核心          |
| 远程 AI 引发隐私顾虑            | 用户不愿使用 AI   | 明确告知发送范围，AI 可关闭            |
| 跨平台打包差异                 | 发布延迟        | 尽早验证 macOS 和 Windows，不等到最后 |
| 导入文件不可信                 | 文件覆盖或数据损坏   | 严格校验、路径限制、预览和事务            |
| 项目名存在重名                 | 搜索与品牌识别困难   | 正式定名前检查 GitHub、包名、商标和域名    |


---



## 17. 当前阶段的明确决策

为减少前期反复讨论，建议先采用以下默认决策：

1. **项目名：** StoryWeave（中文名：墨织），暂定；公开发布前检查名称可用性。
2. **桌面框架：** Tauri 2。
3. **前端：** Vue 3 + TypeScript + Vite + Pinia。
4. **图谱：** Vue Flow。
5. **编辑器：** Markdown 原文编辑，并排预览。实现用 CodeMirror 6，不并行做所见即所得。
6. **本地数据：** SQLite，MVP 中结构化数据和正文优先采用单一权威存储。
7. **后端：** 暂不引入独立 Go/FastAPI 服务；Tauri Rust 层负责本地能力。
8. **AI：** MVP 后接入，通过 Provider 接口支持远程和可选本地模型。
9. **用户信息与多端：** 不存储用户信息，不托管同步。先保证导出、备份、恢复和导入。远端仓库鉴权和自行配置的同步以后通过插件槽接入，凭据属于作者自己。
10. **发布形态：** 当前是桌面版。先确保 macOS 与 Windows 都能构建和安装；Linux 可按贡献完善。移动端在桌面版之后评估。

---



## 18. 下一步行动

建议创建仓库后按以下顺序执行：

1. 初始化 Tauri 2 + Vue 3 + TypeScript 项目。
2. 建立基础布局与项目管理页面。
3. 设计并实现第一版 SQLite schema。
4. 完成 Character CRUD。
5. 接入 Vue Flow，完成关系图和布局持久化。
6. 加入事件、故事线与时间线。
7. 加入编辑器、搜索、导出和备份。
8. 补齐测试、CI、README 与许可证。
9. 发布 MVP 预览版，收集真实创作流程反馈。
10. 再决定 AI、插件槽、作者自己的远端仓库，以及移动端的优先级。

**最终建议：** 把 StoryWeave 的第一目标定为“作者能够稳定地管理一个复杂小说项目”，而不是“尽可能多地集成技术”。先把人物、关系、事件、故事线与章节之间的数据关系设计清楚，后续可视化和 AI 能力都会更容易演进。