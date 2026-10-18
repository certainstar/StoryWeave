# 数据模型

> 版本：v1.0  
> 更新日期：2026-10-16  
> 桌面版 MVP 的项目库结构。命令见 [API](./API.md)

一个小说项目是一份 SQLite 文件。结构化数据和章节正文都在这份文件里。图谱上的坐标不写入人物表。

应用库只保存最近项目、主题和退出标记，表结构不在本文。本文只定义项目库。

## 约定

- 主键是 ULID 字符串。
- 时间用 UTC ISO 8601 文本。
- 外键默认开启。
- 故事内时间是作者写的文本，例如「承安三年冬」。未知则存 `NULL`。排序用整数 `sort_order`，不解析这段文本。
- 删除人物时删除他的关系，并从事件、章节上解除关联。事件和章节保留。
- 删除故事线或章节时，不删除被引用的人物和事件。删除章节时一并删除它的场景。
- 删除事件时，从故事线和章节引用里去掉它。

枚举用下面的中文值，原样存储：

| 字段 | 允许的值 |
| --- | --- |
| 人物状态 | 在场、离场、下落不明 |
| 关系类型 | 亲属、师徒、恋爱、合作、敌对、利用、同门、旧识、未知 |
| 关系区间 | 当前、过去、未知。第一版可以不在界面编辑，列先留着 |
| 故事线类型 | 主线、支线、人物线、感情线 |
| 章节状态 | 构思中、草稿、修订中、完成 |

## 表

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL
);

CREATE TABLE project_meta (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE characters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    aliases_json TEXT NOT NULL DEFAULT '[]',
    role TEXT NOT NULL DEFAULT '',
    appearance TEXT NOT NULL DEFAULT '',
    personality TEXT NOT NULL DEFAULT '',
    goal TEXT NOT NULL DEFAULT '',
    background TEXT NOT NULL DEFAULT '',
    notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT '在场',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (status IN ('在场', '离场', '下落不明'))
);

CREATE INDEX idx_characters_name ON characters(name);

CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    source_id TEXT NOT NULL,
    target_id TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_directional INTEGER NOT NULL DEFAULT 1,
    span TEXT NOT NULL DEFAULT '未知',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (source_id <> target_id),
    CHECK (type IN ('亲属', '师徒', '恋爱', '合作', '敌对', '利用', '同门', '旧识', '未知')),
    CHECK (span IN ('当前', '过去', '未知')),
    FOREIGN KEY (source_id) REFERENCES characters(id) ON DELETE CASCADE,
    FOREIGN KEY (target_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE INDEX idx_relations_source ON relations(source_id);
CREATE INDEX idx_relations_target ON relations(target_id);

CREATE TABLE events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    story_time TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_events_sort ON events(sort_order);

CREATE TABLE event_participants (
    event_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT '',
    PRIMARY KEY (event_id, character_id),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE story_arcs (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT '支线',
    summary TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (kind IN ('主线', '支线', '人物线', '感情线'))
);

CREATE TABLE arc_events (
    arc_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    PRIMARY KEY (arc_id, event_id),
    FOREIGN KEY (arc_id) REFERENCES story_arcs(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE chapters (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT '构思中',
    summary TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (status IN ('构思中', '草稿', '修订中', '完成'))
);

CREATE INDEX idx_chapters_sort ON chapters(sort_order);

CREATE TABLE chapter_characters (
    chapter_id TEXT NOT NULL,
    character_id TEXT NOT NULL,
    PRIMARY KEY (chapter_id, character_id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE chapter_events (
    chapter_id TEXT NOT NULL,
    event_id TEXT NOT NULL,
    PRIMARY KEY (chapter_id, event_id),
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE TABLE scenes (
    id TEXT PRIMARY KEY,
    chapter_id TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    story_time TEXT,
    sort_order INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE INDEX idx_scenes_chapter ON scenes(chapter_id, sort_order);

CREATE TABLE notes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    tags_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE graph_layouts (
    id TEXT PRIMARY KEY,
    viewport_json TEXT NOT NULL DEFAULT '{"x":0,"y":0,"zoom":1}',
    nodes_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
);
```

`project_meta` 只有一行，就是这份文件所代表的项目。人物表不再带 `project_id`，因为一个文件就是一个项目。

`aliases_json` 和 `tags_json` 是字符串数组。`nodes_json` 是人物 id 到 `{ "x": number, "y": number }` 的对象。`is_directional` 为 1 表示有方向。

事件第一次被哪一章叙述，不另存字段。读的时候在章节里找 `sort_order` 最小、且引用了该事件的那一章。没有则视为尚未写入章节。

地点、组织、物品和自定义字段不建表。它们先写在笔记里。
