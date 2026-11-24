# 墨织 UI 大改版 — UX / 功能 Spec

## 1. 组件清单

| 组件 | 路径 | 用途 |
|------|------|------|
| FeedbackHost | `Frontend/src/components/ui/FeedbackHost.vue` | Toast + Modal |
| UiTooltip | `Frontend/src/components/ui/UiTooltip.vue` | 悬停说明 |
| UiPopconfirm | `Frontend/src/components/ui/UiPopconfirm.vue` | 危险确认 |
| VocabField | `Frontend/src/components/ui/VocabField.vue` | 预设 + 自定义 |
| SettingsLayout | `Frontend/src/features/settings/SettingsLayout.vue` | 全屏设置壳 |
| RelationCreateModal | `Frontend/src/features/graph/RelationCreateModal.vue` | 新建关系 |
| AppIcon | `Frontend/src/components/ui/AppIcon.vue` | Lucide 包装 |

## 2. 主题 Token

| ID | data-theme | 预览资源 |
|----|------------|----------|
| paper | paper | `/themes/paper/preview.jpg` |
| ink | ink | `/themes/ink/preview.jpg` |
| fourgentlemen | fourgentlemen | `/themes/fourgentlemen/preview.jpg` |
| mountain | mountain | `/themes/mountain/preview.jpg` |
| dragon | dragon | `/themes/dragon/preview.jpg` |

迁移：`bamboo|plum|orchid|chrysanthemum` → `fourgentlemen`

## 3. 设置 IA

```
顶栏 [返回] 墨织 · {项目名}                    [状态]
├─ 主题（网格 5 卡）
├─ 离开页面（单选）
├─ 数据位置（路径 + 复制 + 打开文件夹）
├─ 快照（本地时间 + 相对 + Popconfirm 恢复）
├─ 快捷键（只读表）
├─ 插件
└─ 危险操作（删除项目 + Popconfirm）
```

## 4. 交互状态

| 元素 | 默认 | hover | 选中/聚焦 | 禁用 |
|------|------|-------|-----------|------|
| 主题卡 | 细边框 | 微上移 | 左侧色条 + 浅底 | — |
| 导航项 | 透明 | 浅底 | `aria-current` 色条 | — |
| 时间线卡 | 阴影 | 加深 | 左边框 seal 色 | — |
| 搜索项 | — | 浅底 | 键盘焦点内底 | — |
| 焦点环 | 无（鼠标） | — | `:focus-visible` 1px 内描边 | — |

## 5. 时间格式

- 输入：`snapshotAt` ISO / `YYYYMMDDTHHMMSSZ`
- 展示：`YYYY-MM-DD HH:mm:ss`（本地时区）
- 副文案：相对时间（如「3 天前」）

## 6. 验收用例（映射用户 13 条）

| # | 用例 | 步骤 | 期望 |
|---|------|------|------|
| 1 | 四君子主题 | 设置选「四君子」 | 背景四象限纹样；旧竹/梅/兰/菊偏好自动映射 |
| 2 | 搜索美观 | 顶栏输入无结果/有结果 | 分组+图标；空状态文案；无裸露边框 |
| 3 | 主题预览 | 打开设置主题区 | 5 张 preview 图，非纯色渐变条 |
| 4 | 快照时间 | 做快照 | 列表为本地时间，无 `T033154Z` 原串 |
| 5 | 事件排序 | 拖拽与上移下移 | 刷新后顺序不变 |
| 6 | 全屏设置 | Alt+8 或点设置 | 无左导航、无 Inspector |
| 7 | 快捷键说明 | 设置内快捷键区 | 与 Alt+1…8 一致 |
| 8 | 脉络动效 | 切换时间线/故事线 | 有 stagger；系统减少动效时关闭 |
| 9 | Popconfirm | 恢复快照 | 无 `window.confirm` |
| 10 | 无丑描线 | 鼠标点选时间线项 | 无外圈 outline；Tab 仍可聚焦 |
| 11 | 新建关系 | 关系图点建立 | 居中 Modal，纵向表单 |
| 12 | 图标 | 侧栏/时间线上移 | 图标+aria-label |
| 13 | 自定义类型 | 关系类型选自定义输入新词 | 保存成功，Inspector 显示 |

## 7. API / 后端变更

- `set_theme`：`THEME_IDS` 含 `fourgentlemen`，旧四 ID 写入时拒绝或映射
- `relation_create/update`、`character_*`、`chapter_*`、`arc_*`：类型/状态字段改用 `require_vocab_label`
- `vocab_list`：不变（预设列表）；自定义值存于实体字段

## 8. 已知环境日志（非缺陷）

在 macOS 上运行 Tauri 时，控制台可能出现 `IMKCFRunLoopWakeUpReliable`（输入法框架）。若应用无崩溃、输入正常，可忽略。

## 9. 文件索引

- 主题域：`Frontend/src/domain/themes.ts`、`types.ts`
- 偏好：`Frontend/src-tauri/src/db/prefs.rs`
- 工作台：`Frontend/src/features/shell/Workbench.vue`
- 搜索：`Frontend/src/features/shell/TopSearch.vue`