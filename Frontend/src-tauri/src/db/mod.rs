//! SQLite 访问。每个小说项目一个文件，应用偏好另放一份库。
//!
//! 规则判断在 `domain`。这里只负责读写，并保证外键生效。

use crate::domain::{require_name, require_one_of, require_permutation, require_unique};
use crate::error::ApiError;
use crate::models::*;
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};

const SCHEMA: &str = include_str!("schema.sql");

const CHARACTER_STATUS: &[&str] = &["在场", "离场", "下落不明"];
const RELATION_TYPES: &[&str] = &["亲属", "师徒", "恋爱", "合作", "敌对", "利用", "同门", "旧识", "未知"];
const SPANS: &[&str] = &["当前", "过去", "未知"];
const ARC_KINDS: &[&str] = &["主线", "支线", "人物线", "感情线"];
const CHAPTER_STATUS: &[&str] = &["构思中", "草稿", "修订中", "完成"];

/// 打开数据库并开启外键。
///
/// * `path` - 库文件。不存在时会创建。
///
/// 返回连接。打不开时返回 `STORAGE_ERROR`。
pub fn connect(path: &Path) -> Result<Connection, ApiError> {
    let conn = Connection::open(path).map_err(storage)?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .map_err(storage)?;
    Ok(conn)
}

/// 把项目库补到当前结构。可以重复调用。
///
/// * `conn` - 已打开的项目库。
///
/// 失败时返回 `MIGRATION_ERROR`，不继续写入业务数据。
pub fn migrate(conn: &Connection) -> Result<(), ApiError> {
    conn.execute_batch(SCHEMA).map_err(migration)?;
    let version: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            [],
            |row| row.get(0),
        )
        .map_err(migration)?;
    if version < 1 {
        conn.execute(
            "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?1)",
            [now()],
        )
        .map_err(migration)?;
    }
    Ok(())
}

/// 初始化应用库。
///
/// * `conn` - 应用库连接。
pub fn migrate_app(conn: &Connection) -> Result<(), ApiError> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS preferences (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            path TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            last_opened_at TEXT NOT NULL
        );
        ",
    )
    .map_err(storage)?;
    conn.execute(
        "INSERT OR IGNORE INTO preferences (key, value) VALUES ('theme', 'paper'), ('clean_exit', '1'), ('recovery_skip', '')",
        [],
    )
    .map_err(storage)?;
    Ok(())
}

/// 读取主题。缺省为宣纸。
///
/// * `conn` - 应用库。
pub fn theme(conn: &Connection) -> Result<String, ApiError> {
    preference(conn, "theme").map(|value| {
        if value == "ink" {
            "ink".into()
        } else {
            "paper".into()
        }
    })
}

/// 保存主题。只接受 `paper` 和 `ink`。
///
/// * `conn` - 应用库。
/// * `value` - 主题标识。
///
/// 返回保存后的主题。非法值返回 `VALIDATION_ERROR`。
pub fn set_theme(conn: &Connection, value: &str) -> Result<String, ApiError> {
    if value != "paper" && value != "ink" {
        return Err(ApiError::validation("UNKNOWN_STATUS", "选择宣纸或夜墨。"));
    }
    set_preference(conn, "theme", value)?;
    Ok(value.to_string())
}

/// 启动时记下上次是否正常退出，并把本次标记为尚未退出。
///
/// * `conn` - 应用库。
///
/// 返回上次的 `clean_exit` 是否为正常（`1`）。
pub fn begin_session(conn: &Connection) -> Result<bool, ApiError> {
    let clean = preference(conn, "clean_exit")? == "1";
    set_preference(conn, "clean_exit", "0")?;
    Ok(clean)
}

/// 正常退出时调用。
///
/// * `conn` - 应用库。
pub fn mark_clean(conn: &Connection) -> Result<(), ApiError> {
    set_preference(conn, "clean_exit", "1")
}

/// 作者拒绝恢复同一份快照后，不再为它重复询问。
///
/// * `conn` - 应用库。
/// * `token` - `项目 id + 快照时间`。
pub fn skip_recovery(conn: &Connection, token: &str) -> Result<(), ApiError> {
    set_preference(conn, "recovery_skip", token)
}

/// 上次跳过的恢复标记。
///
/// * `conn` - 应用库。
pub fn recovery_skip(conn: &Connection) -> Result<String, ApiError> {
    preference(conn, "recovery_skip")
}

/// 最近打开的项目，新的在前。
///
/// * `conn` - 应用库。
pub fn list_projects(conn: &Connection) -> Result<Vec<ProjectSummary>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, description, path, updated_at, last_opened_at
             FROM projects ORDER BY last_opened_at DESC",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], map_project)
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 按 id 取项目摘要。
///
/// * `conn` - 应用库。
/// * `id` - 项目 id。
///
/// 不存在时返回 `NOT_FOUND`。
pub fn get_project(conn: &Connection, id: &str) -> Result<ProjectSummary, ApiError> {
    conn.query_row(
        "SELECT id, name, description, path, updated_at, last_opened_at FROM projects WHERE id = ?1",
        [id],
        map_project,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

/// 新建项目文件，并记入最近列表。
///
/// * `app` - 应用库。
/// * `dir` - 存放项目文件的目录。
/// * `name` - 项目名称。
/// * `description` - 简介，可空。
///
/// 返回项目摘要。名称为空白时返回 `EMPTY_NAME`。
pub fn create_project(
    app: &Connection,
    dir: &Path,
    name: &str,
    description: &str,
) -> Result<ProjectSummary, ApiError> {
    let name = require_name(name)?;
    let id = new_id();
    let stamp = now();
    fs::create_dir_all(dir).map_err(storage)?;
    let path = dir.join(format!("{id}.sqlite"));
    let project = connect(&path)?;
    migrate(&project)?;
    project
        .execute(
            "INSERT INTO project_meta (id, name, description, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?4)",
            params![id, name, description.trim(), stamp],
        )
        .map_err(storage)?;
    project
        .execute(
            "INSERT INTO graph_layouts (id, updated_at) VALUES ('default', ?1)",
            [&stamp],
        )
        .map_err(storage)?;
    let summary = ProjectSummary {
        id: id.clone(),
        name,
        description: description.trim().to_string(),
        path: path.display().to_string(),
        updated_at: stamp.clone(),
        last_opened_at: stamp,
    };
    upsert_project(app, &summary)?;
    Ok(summary)
}

/// 更新项目名称或简介。
///
/// * `app` - 应用库。
/// * `project` - 项目库。
/// * `id` - 项目 id。
/// * `name` - 新名称。`None` 表示不改。
/// * `description` - 新简介。`None` 表示不改。
pub fn update_project(
    app: &Connection,
    project: &Connection,
    id: &str,
    name: Option<&str>,
    description: Option<&str>,
) -> Result<ProjectSummary, ApiError> {
    let mut summary = get_project(app, id)?;
    if let Some(name) = name {
        summary.name = require_name(name)?;
    }
    if let Some(description) = description {
        summary.description = description.trim().to_string();
    }
    let stamp = now();
    summary.updated_at = stamp.clone();
    project
        .execute(
            "UPDATE project_meta SET name = ?1, description = ?2, updated_at = ?3 WHERE id = ?4",
            params![summary.name, summary.description, stamp, id],
        )
        .map_err(storage)?;
    upsert_project(app, &summary)?;
    Ok(summary)
}

/// 把项目标成刚刚打开。
///
/// * `app` - 应用库。
/// * `id` - 项目 id。
pub fn mark_opened(app: &Connection, id: &str) -> Result<ProjectSummary, ApiError> {
    let mut summary = get_project(app, id)?;
    summary.last_opened_at = now();
    upsert_project(app, &summary)?;
    Ok(summary)
}

/// 人物列表，按姓名排序。
///
/// * `conn` - 项目库。
pub fn list_characters(conn: &Connection) -> Result<Vec<Character>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at
             FROM characters ORDER BY name",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_character).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 新增人物。
///
/// * `conn` - 项目库。
/// * `input` - 档案。名称必填，状态缺省为在场。
pub fn create_character(conn: &Connection, input: CharacterInput) -> Result<Character, ApiError> {
    let name = require_name(input.name.as_deref().unwrap_or(""))?;
    let status = input.status.unwrap_or_else(|| "在场".into());
    require_one_of(&status, CHARACTER_STATUS, "UNKNOWN_STATUS", "选择一种状态")?;
    let stamp = now();
    let character = Character {
        id: new_id(),
        name,
        aliases: input.aliases.unwrap_or_default(),
        role: input.role.unwrap_or_default(),
        appearance: input.appearance.unwrap_or_default(),
        personality: input.personality.unwrap_or_default(),
        goal: input.goal.unwrap_or_default(),
        background: input.background.unwrap_or_default(),
        notes: input.notes.unwrap_or_default(),
        status,
        created_at: stamp.clone(),
        updated_at: stamp,
    };
    save_character(conn, &character)?;
    Ok(character)
}

/// 修改人物。省略的字段保持原值。
///
/// * `conn` - 项目库。
/// * `id` - 人物 id。
/// * `input` - 要改的字段。
///
/// 人物不存在时返回 `NOT_FOUND`。
pub fn update_character(conn: &Connection, id: &str, input: CharacterInput) -> Result<Character, ApiError> {
    let mut character = get_character(conn, id)?;
    if let Some(name) = input.name {
        character.name = require_name(&name)?;
    }
    if let Some(aliases) = input.aliases {
        character.aliases = aliases;
    }
    if let Some(role) = input.role {
        character.role = role;
    }
    if let Some(appearance) = input.appearance {
        character.appearance = appearance;
    }
    if let Some(personality) = input.personality {
        character.personality = personality;
    }
    if let Some(goal) = input.goal {
        character.goal = goal;
    }
    if let Some(background) = input.background {
        character.background = background;
    }
    if let Some(notes) = input.notes {
        character.notes = notes;
    }
    if let Some(status) = input.status {
        require_one_of(&status, CHARACTER_STATUS, "UNKNOWN_STATUS", "选择一种状态")?;
        character.status = status;
    }
    character.updated_at = now();
    save_character(conn, &character)?;
    Ok(character)
}

/// 删除人物。关系一并删除，事件和章节保留，只解除关联。
///
/// * `conn` - 项目库。
/// * `id` - 人物 id。
///
/// 返回被删除的 id。不存在时返回 `NOT_FOUND`。
pub fn delete_character(conn: &Connection, id: &str) -> Result<String, ApiError> {
    let changed = conn
        .execute("DELETE FROM characters WHERE id = ?1", [id])
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    Ok(id.to_string())
}

/// 关系列表。
///
/// * `conn` - 项目库。
pub fn list_relations(conn: &Connection) -> Result<Vec<Relation>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, source_id, target_id, type, description, is_directional, span, created_at, updated_at
             FROM relations ORDER BY created_at",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_relation).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 建立关系。两端必须是不同的、已经存在的人物。
///
/// * `conn` - 项目库。
/// * `input` - 关系。
pub fn create_relation(conn: &Connection, input: RelationInput) -> Result<Relation, ApiError> {
    let source_id = input.source_id.clone().unwrap_or_default();
    let target_id = input.target_id.clone().unwrap_or_default();
    require_distinct_pair(&source_id, &target_id)?;
    require_character(conn, &source_id)?;
    require_character(conn, &target_id)?;
    let kind = input.r#type.unwrap_or_else(|| "未知".into());
    require_one_of(&kind, RELATION_TYPES, "UNKNOWN_TYPE", "选择一种关系类型")?;
    let span = input.span.unwrap_or_else(|| "未知".into());
    require_one_of(&span, SPANS, "UNKNOWN_STATUS", "选择一种关系区间")?;
    let stamp = now();
    let relation = Relation {
        id: new_id(),
        source_id,
        target_id,
        r#type: kind,
        description: input.description.unwrap_or_default(),
        directional: input.directional.unwrap_or(true),
        span,
        created_at: stamp.clone(),
        updated_at: stamp,
    };
    save_relation(conn, &relation)?;
    Ok(relation)
}

/// 修改关系。省略的字段保持原值。
///
/// * `conn` - 项目库。
/// * `id` - 关系 id。
/// * `input` - 要改的字段。
pub fn update_relation(conn: &Connection, id: &str, input: RelationInput) -> Result<Relation, ApiError> {
    let mut relation = get_relation(conn, id)?;
    if let Some(source_id) = input.source_id {
        relation.source_id = source_id;
    }
    if let Some(target_id) = input.target_id {
        relation.target_id = target_id;
    }
    require_distinct_pair(&relation.source_id, &relation.target_id)?;
    require_character(conn, &relation.source_id)?;
    require_character(conn, &relation.target_id)?;
    if let Some(kind) = input.r#type {
        require_one_of(&kind, RELATION_TYPES, "UNKNOWN_TYPE", "选择一种关系类型")?;
        relation.r#type = kind;
    }
    if let Some(description) = input.description {
        relation.description = description;
    }
    if let Some(directional) = input.directional {
        relation.directional = directional;
    }
    if let Some(span) = input.span {
        require_one_of(&span, SPANS, "UNKNOWN_STATUS", "选择一种关系区间")?;
        relation.span = span;
    }
    relation.updated_at = now();
    save_relation(conn, &relation)?;
    Ok(relation)
}

/// 删除一条关系。不删除人物。
///
/// * `conn` - 项目库。
/// * `id` - 关系 id。
pub fn delete_relation(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM relations WHERE id = ?1", id)
}

/// 读取图谱布局。还没有保存过时返回空布局。
///
/// * `conn` - 项目库。
pub fn get_layout(conn: &Connection) -> Result<GraphLayout, ApiError> {
    let row = conn
        .query_row(
            "SELECT viewport_json, nodes_json, updated_at FROM graph_layouts WHERE id = 'default'",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                ))
            },
        )
        .optional()
        .map_err(storage)?;
    let Some((viewport, nodes, updated_at)) = row else {
        return Ok(empty_layout());
    };
    Ok(GraphLayout {
        viewport: serde_json::from_str(&viewport).unwrap_or(Viewport { x: 0.0, y: 0.0, zoom: 1.0 }),
        nodes: serde_json::from_str(&nodes).unwrap_or_default(),
        updated_at,
    })
}

/// 保存视口，并合并节点坐标。没出现在 `nodes` 里的旧坐标保留。
///
/// * `conn` - 项目库。
/// * `viewport` - 缩放和平移。
/// * `nodes` - 本次改动的节点。
pub fn save_layout(
    conn: &Connection,
    viewport: Viewport,
    nodes: BTreeMap<String, NodePos>,
) -> Result<GraphLayout, ApiError> {
    let mut layout = get_layout(conn)?;
    layout.viewport = viewport;
    layout.nodes.extend(nodes);
    layout.updated_at = now();
    let viewport_json = serde_json::to_string(&layout.viewport).map_err(storage)?;
    let nodes_json = serde_json::to_string(&layout.nodes).map_err(storage)?;
    conn.execute(
        "INSERT INTO graph_layouts (id, viewport_json, nodes_json, updated_at) VALUES ('default', ?1, ?2, ?3)
         ON CONFLICT(id) DO UPDATE SET viewport_json = ?1, nodes_json = ?2, updated_at = ?3",
        params![viewport_json, nodes_json, layout.updated_at],
    )
    .map_err(storage)?;
    Ok(layout)
}

/// 事件列表，按故事内顺序。
///
/// * `conn` - 项目库。
pub fn list_events(conn: &Connection) -> Result<Vec<StoryEvent>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, description, story_time, sort_order, created_at, updated_at
             FROM events ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(StoryEvent {
                id: row.get(0)?,
                title: row.get(1)?,
                description: row.get(2)?,
                story_time: row.get(3)?,
                sort_order: row.get(4)?,
                participants: Vec::new(),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(storage)?;
    let mut events = rows.collect::<Result<Vec<_>, _>>().map_err(storage)?;
    for event in &mut events {
        event.participants = participants(conn, &event.id)?;
    }
    Ok(events)
}

/// 新增事件，排在当前顺序的末尾。
///
/// * `conn` - 项目库。
/// * `input` - 事件。标题必填。
pub fn create_event(conn: &Connection, input: EventInput) -> Result<StoryEvent, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let participants = input.participants.unwrap_or_default();
    ensure_characters(conn, &participants)?;
    let sort_order = next_sort(conn, "events")?;
    let stamp = now();
    let id = new_id();
    let tx = conn.unchecked_transaction().map_err(storage)?;
    tx.execute(
        "INSERT INTO events (id, title, description, story_time, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![
            id,
            title,
            input.description.unwrap_or_default(),
            blank_to_null(input.story_time),
            sort_order,
            stamp
        ],
    )
    .map_err(storage)?;
    replace_participants(&tx, &id, &participants)?;
    tx.commit().map_err(storage)?;
    get_event(conn, &id)
}

/// 修改事件。`participants` 给出时整体替换参与者。
///
/// * `conn` - 项目库。
/// * `id` - 事件 id。
/// * `input` - 要改的字段。
pub fn update_event(conn: &Connection, id: &str, input: EventInput) -> Result<StoryEvent, ApiError> {
    let current = get_event(conn, id)?;
    let title = match input.title {
        Some(title) => require_name(&title)?,
        None => current.title,
    };
    let description = input.description.unwrap_or(current.description);
    let story_time = match input.story_time {
        Some(value) => blank_to_null(Some(value)),
        None => current.story_time,
    };
    let participants = input.participants.unwrap_or(current.participants);
    ensure_characters(conn, &participants)?;
    let stamp = now();
    let tx = conn.unchecked_transaction().map_err(storage)?;
    let changed = tx
        .execute(
            "UPDATE events SET title = ?1, description = ?2, story_time = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, description, story_time, stamp, id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    replace_participants(&tx, id, &participants)?;
    tx.commit().map_err(storage)?;
    get_event(conn, id)
}

/// 删除事件，并把它从故事线和章节引用里去掉。
///
/// * `conn` - 项目库。
/// * `id` - 事件 id。
pub fn delete_event(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM events WHERE id = ?1", id)
}

/// 重排事件。`ids` 必须是全部事件的一个排列。
///
/// * `conn` - 项目库。
/// * `ids` - 新的故事内顺序。
pub fn reorder_events(conn: &Connection, ids: &[String]) -> Result<Vec<StoryEvent>, ApiError> {
    let existing = list_events(conn)?;
    let existing_ids: Vec<String> = existing.iter().map(|event| event.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE events SET sort_order = ?1 WHERE id = ?2",
            params![index as i64 + 1, id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_events(conn)
}

/// 故事线列表。
///
/// * `conn` - 项目库。
pub fn list_arcs(conn: &Connection) -> Result<Vec<StoryArc>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, kind, summary, sort_order, created_at, updated_at
             FROM story_arcs ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(StoryArc {
                id: row.get(0)?,
                title: row.get(1)?,
                kind: row.get(2)?,
                summary: row.get(3)?,
                sort_order: row.get(4)?,
                event_ids: Vec::new(),
                created_at: row.get(5)?,
                updated_at: row.get(6)?,
            })
        })
        .map_err(storage)?;
    let mut arcs = rows.collect::<Result<Vec<_>, _>>().map_err(storage)?;
    for arc in &mut arcs {
        arc.event_ids = arc_event_ids(conn, &arc.id)?;
    }
    Ok(arcs)
}

/// 新建故事线。
///
/// * `conn` - 项目库。
/// * `input` - 标题必填，类型缺省为支线。
pub fn create_arc(conn: &Connection, input: ArcInput) -> Result<StoryArc, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let kind = input.kind.unwrap_or_else(|| "支线".into());
    require_one_of(&kind, ARC_KINDS, "UNKNOWN_KIND", "选择一种故事线")?;
    let stamp = now();
    let id = new_id();
    let sort_order = next_sort(conn, "story_arcs")?;
    conn.execute(
        "INSERT INTO story_arcs (id, title, kind, summary, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![id, title, kind, input.summary.unwrap_or_default(), sort_order, stamp],
    )
    .map_err(storage)?;
    get_arc(conn, &id)
}

/// 修改故事线的标题、类型或简介。不改事件顺序。
///
/// * `conn` - 项目库。
/// * `id` - 故事线 id。
/// * `input` - 要改的字段。
pub fn update_arc(conn: &Connection, id: &str, input: ArcInput) -> Result<StoryArc, ApiError> {
    let current = get_arc(conn, id)?;
    let title = match input.title {
        Some(title) => require_name(&title)?,
        None => current.title,
    };
    let kind = input.kind.unwrap_or(current.kind);
    require_one_of(&kind, ARC_KINDS, "UNKNOWN_KIND", "选择一种故事线")?;
    let summary = input.summary.unwrap_or(current.summary);
    let changed = conn
        .execute(
            "UPDATE story_arcs SET title = ?1, kind = ?2, summary = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, kind, summary, now(), id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    get_arc(conn, id)
}

/// 删除故事线。事件本身保留。
///
/// * `conn` - 项目库。
/// * `id` - 故事线 id。
pub fn delete_arc(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM story_arcs WHERE id = ?1", id)
}

/// 用一份有序列表替换故事线里的事件。
///
/// * `conn` - 项目库。
/// * `id` - 故事线 id。
/// * `event_ids` - 新顺序。不能重复，每个 id 都要是已有事件。
pub fn set_arc_events(conn: &Connection, id: &str, event_ids: &[String]) -> Result<StoryArc, ApiError> {
    get_arc(conn, id)?;
    require_unique(event_ids)?;
    for event_id in event_ids {
        get_event(conn, event_id)?;
    }
    let tx = conn.unchecked_transaction().map_err(storage)?;
    tx.execute("DELETE FROM arc_events WHERE arc_id = ?1", [id])
        .map_err(storage)?;
    for (index, event_id) in event_ids.iter().enumerate() {
        tx.execute(
            "INSERT INTO arc_events (arc_id, event_id, sort_order) VALUES (?1, ?2, ?3)",
            params![id, event_id, index as i64 + 1],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    get_arc(conn, id)
}

/// 章节列表，按叙述顺序。
///
/// * `conn` - 项目库。
pub fn list_chapters(conn: &Connection) -> Result<Vec<Chapter>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, status, summary, content, sort_order, created_at, updated_at
             FROM chapters ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([], |row| {
            Ok(Chapter {
                id: row.get(0)?,
                title: row.get(1)?,
                status: row.get(2)?,
                summary: row.get(3)?,
                content: row.get(4)?,
                sort_order: row.get(5)?,
                character_ids: Vec::new(),
                event_ids: Vec::new(),
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        })
        .map_err(storage)?;
    let mut chapters = rows.collect::<Result<Vec<_>, _>>().map_err(storage)?;
    for chapter in &mut chapters {
        chapter.character_ids = link_ids(conn, "chapter_characters", "character_id", &chapter.id)?;
        chapter.event_ids = link_ids(conn, "chapter_events", "event_id", &chapter.id)?;
    }
    Ok(chapters)
}

/// 新建章节。正文缺省为空，状态缺省为构思中。
///
/// * `conn` - 项目库。
/// * `input` - 章节。标题必填。
pub fn create_chapter(conn: &Connection, input: ChapterInput) -> Result<Chapter, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let status = input.status.unwrap_or_else(|| "构思中".into());
    require_one_of(&status, CHAPTER_STATUS, "UNKNOWN_STATUS", "选择一种状态")?;
    let stamp = now();
    let id = new_id();
    let sort_order = next_sort(conn, "chapters")?;
    conn.execute(
        "INSERT INTO chapters (id, title, status, summary, content, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            id,
            title,
            status,
            input.summary.unwrap_or_default(),
            input.content.unwrap_or_default(),
            sort_order,
            stamp
        ],
    )
    .map_err(storage)?;
    get_chapter(conn, &id)
}

/// 修改章节。`character_ids` 或 `event_ids` 给出时整体替换关联。
///
/// * `conn` - 项目库。
/// * `id` - 章节 id。
/// * `input` - 要改的字段。`content` 按 Markdown 原文保存。
pub fn update_chapter(conn: &Connection, id: &str, input: ChapterInput) -> Result<Chapter, ApiError> {
    let current = get_chapter(conn, id)?;
    let title = match input.title {
        Some(title) => require_name(&title)?,
        None => current.title,
    };
    let status = input.status.unwrap_or(current.status);
    require_one_of(&status, CHAPTER_STATUS, "UNKNOWN_STATUS", "选择一种状态")?;
    let summary = input.summary.unwrap_or(current.summary);
    let content = input.content.unwrap_or(current.content);
    let character_ids = input.character_ids.unwrap_or(current.character_ids);
    let event_ids = input.event_ids.unwrap_or(current.event_ids);
    require_unique(&character_ids)?;
    require_unique(&event_ids)?;
    for character_id in &character_ids {
        require_character(conn, character_id)?;
    }
    for event_id in &event_ids {
        get_event(conn, event_id)?;
    }
    let tx = conn.unchecked_transaction().map_err(storage)?;
    let changed = tx
        .execute(
            "UPDATE chapters SET title = ?1, status = ?2, summary = ?3, content = ?4, updated_at = ?5 WHERE id = ?6",
            params![title, status, summary, content, now(), id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    replace_links(&tx, "chapter_characters", "character_id", id, &character_ids)?;
    replace_links(&tx, "chapter_events", "event_id", id, &event_ids)?;
    tx.commit().map_err(storage)?;
    get_chapter(conn, id)
}

/// 删除章节及其场景。人物和事件保留。
///
/// * `conn` - 项目库。
/// * `id` - 章节 id。
pub fn delete_chapter(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM chapters WHERE id = ?1", id)
}

/// 重排章节。
///
/// * `conn` - 项目库。
/// * `ids` - 新的叙述顺序，必须包含全部章节。
pub fn reorder_chapters(conn: &Connection, ids: &[String]) -> Result<Vec<Chapter>, ApiError> {
    let existing = list_chapters(conn)?;
    let existing_ids: Vec<String> = existing.iter().map(|chapter| chapter.id.clone()).collect();
    require_permutation(&existing_ids, ids)?;
    let tx = conn.unchecked_transaction().map_err(storage)?;
    for (index, id) in ids.iter().enumerate() {
        tx.execute(
            "UPDATE chapters SET sort_order = ?1 WHERE id = ?2",
            params![index as i64 + 1, id],
        )
        .map_err(storage)?;
    }
    tx.commit().map_err(storage)?;
    list_chapters(conn)
}

/// 某一章的场景，按场景顺序。
///
/// * `conn` - 项目库。
/// * `chapter_id` - 章节 id。
pub fn list_scenes(conn: &Connection, chapter_id: &str) -> Result<Vec<Scene>, ApiError> {
    get_chapter(conn, chapter_id)?;
    let mut stmt = conn
        .prepare(
            "SELECT id, chapter_id, title, summary, story_time, sort_order, created_at, updated_at
             FROM scenes WHERE chapter_id = ?1 ORDER BY sort_order, title",
        )
        .map_err(storage)?;
    let rows = stmt
        .query_map([chapter_id], map_scene)
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 在章节下新增场景。
///
/// * `conn` - 项目库。
/// * `input` - 场景。标题和章节 id 必填。
pub fn create_scene(conn: &Connection, input: SceneInput) -> Result<Scene, ApiError> {
    let chapter_id = input.chapter_id.clone().unwrap_or_default();
    get_chapter(conn, &chapter_id)?;
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let sort_order = conn
        .query_row(
            "SELECT COALESCE(MAX(sort_order), 0) + 1 FROM scenes WHERE chapter_id = ?1",
            [&chapter_id],
            |row| row.get::<_, i64>(0),
        )
        .map_err(storage)?;
    let stamp = now();
    let id = new_id();
    conn.execute(
        "INSERT INTO scenes (id, chapter_id, title, summary, story_time, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            id,
            chapter_id,
            title,
            input.summary.unwrap_or_default(),
            blank_to_null(input.story_time),
            sort_order,
            stamp
        ],
    )
    .map_err(storage)?;
    get_scene(conn, &id)
}

/// 修改场景。
///
/// * `conn` - 项目库。
/// * `id` - 场景 id。
/// * `input` - 要改的字段。
pub fn update_scene(conn: &Connection, id: &str, input: SceneInput) -> Result<Scene, ApiError> {
    let current = get_scene(conn, id)?;
    let title = match &input.title {
        Some(title) => require_name(title)?,
        None => current.title,
    };
    let summary = input.summary.unwrap_or(current.summary);
    let story_time = match input.story_time {
        Some(value) => blank_to_null(Some(value)),
        None => current.story_time,
    };
    let changed = conn
        .execute(
            "UPDATE scenes SET title = ?1, summary = ?2, story_time = ?3, updated_at = ?4 WHERE id = ?5",
            params![title, summary, story_time, now(), id],
        )
        .map_err(storage)?;
    if changed == 0 {
        return Err(ApiError::not_found());
    }
    get_scene(conn, id)
}

/// 删除场景。章节保留。
///
/// * `conn` - 项目库。
/// * `id` - 场景 id。
pub fn delete_scene(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM scenes WHERE id = ?1", id)
}

/// 笔记列表，最近修改的在前。
///
/// * `conn` - 项目库。
pub fn list_notes(conn: &Connection) -> Result<Vec<Note>, ApiError> {
    let mut stmt = conn
        .prepare(
            "SELECT id, title, content, tags_json, created_at, updated_at
             FROM notes ORDER BY updated_at DESC",
        )
        .map_err(storage)?;
    let rows = stmt.query_map([], map_note).map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

/// 新建笔记。
///
/// * `conn` - 项目库。
/// * `input` - 标题必填。
pub fn create_note(conn: &Connection, input: NoteInput) -> Result<Note, ApiError> {
    let title = require_name(input.title.as_deref().unwrap_or(""))?;
    let stamp = now();
    let note = Note {
        id: new_id(),
        title,
        content: input.content.unwrap_or_default(),
        tags: input.tags.unwrap_or_default(),
        created_at: stamp.clone(),
        updated_at: stamp,
    };
    save_note(conn, &note)?;
    Ok(note)
}

/// 修改笔记。
///
/// * `conn` - 项目库。
/// * `id` - 笔记 id。
/// * `input` - 要改的字段。
pub fn update_note(conn: &Connection, id: &str, input: NoteInput) -> Result<Note, ApiError> {
    let mut note = get_note(conn, id)?;
    if let Some(title) = input.title {
        note.title = require_name(&title)?;
    }
    if let Some(content) = input.content {
        note.content = content;
    }
    if let Some(tags) = input.tags {
        note.tags = tags;
    }
    note.updated_at = now();
    save_note(conn, &note)?;
    Ok(note)
}

/// 删除笔记。
///
/// * `conn` - 项目库。
/// * `id` - 笔记 id。
pub fn delete_note(conn: &Connection, id: &str) -> Result<String, ApiError> {
    delete_row(conn, "DELETE FROM notes WHERE id = ?1", id)
}

/// 在人物、事件、故事线、章节和笔记里查找包含 `query` 的记录。
///
/// * `conn` - 项目库。
/// * `query` - 作者输入。空白时返回空数组。
pub fn search(conn: &Connection, query: &str) -> Result<Vec<SearchHit>, ApiError> {
    let query = query.trim();
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let mut hits = Vec::new();
    push_hits(
        conn,
        &mut hits,
        "character",
        "SELECT id, name FROM characters WHERE instr(lower(name), lower(?1)) > 0 OR instr(lower(aliases_json), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "event",
        "SELECT id, title FROM events WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(description), lower(?1)) > 0 OR instr(lower(COALESCE(story_time, '')), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "arc",
        "SELECT id, title FROM story_arcs WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(summary), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "chapter",
        "SELECT id, title FROM chapters WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(summary), lower(?1)) > 0 OR instr(lower(content), lower(?1)) > 0",
        query,
    )?;
    push_hits(
        conn,
        &mut hits,
        "note",
        "SELECT id, title FROM notes WHERE instr(lower(title), lower(?1)) > 0 OR instr(lower(content), lower(?1)) > 0 OR instr(lower(tags_json), lower(?1)) > 0",
        query,
    )?;
    Ok(hits)
}

/// 把项目库复制成一份快照文件。
///
/// * `source` - 已打开的项目库。
/// * `dest` - 快照路径。父目录需要已存在。
pub fn backup_to(source: &Connection, dest: &Path) -> Result<(), ApiError> {
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(storage)?;
    }
    source.backup("main", dest, None).map_err(backup_err)?;
    Ok(())
}

/// 快照目录中最新的一份。目录不存在时返回空。
///
/// * `dir` - `{数据目录}/backups/{项目 id}`。
pub fn latest_snapshot(dir: &Path) -> Option<String> {
    snapshot_names(dir).into_iter().next()
}

/// 快照时间列表，新的在前，最多 10 条。更旧的文件会删掉。
///
/// * `dir` - 该项目的快照目录。
pub fn prune_snapshots(dir: &Path) -> Result<Vec<String>, ApiError> {
    let mut names = snapshot_names(dir);
    if names.len() > 10 {
        for extra in names.drain(10..) {
            let _ = fs::remove_file(dir.join(format!("{extra}.sqlite")));
        }
    }
    Ok(names)
}

fn snapshot_names(dir: &Path) -> Vec<String> {
    let mut names = fs::read_dir(dir)
        .ok()
        .into_iter()
        .flatten()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            name.strip_suffix(".sqlite").map(|value| value.to_string())
        })
        .collect::<Vec<_>>();
    names.sort();
    names.reverse();
    names
}

/// 新建或覆盖应用库里的项目记录。
///
/// * `conn` - 应用库。
/// * `summary` - 要保存的摘要。
pub fn upsert_project(conn: &Connection, summary: &ProjectSummary) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO projects (id, name, description, path, updated_at, last_opened_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET
            name = ?2, description = ?3, path = ?4, updated_at = ?5, last_opened_at = ?6",
        params![
            summary.id,
            summary.name,
            summary.description,
            summary.path,
            summary.updated_at,
            summary.last_opened_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}

/// 人物写入用的可选字段。
#[derive(Debug, Default)]
pub struct CharacterInput {
    pub name: Option<String>,
    pub aliases: Option<Vec<String>>,
    pub role: Option<String>,
    pub appearance: Option<String>,
    pub personality: Option<String>,
    pub goal: Option<String>,
    pub background: Option<String>,
    pub notes: Option<String>,
    pub status: Option<String>,
}

/// 关系写入用的可选字段。
#[derive(Debug, Default)]
pub struct RelationInput {
    pub source_id: Option<String>,
    pub target_id: Option<String>,
    pub r#type: Option<String>,
    pub description: Option<String>,
    pub directional: Option<bool>,
    pub span: Option<String>,
}

/// 事件写入用的可选字段。
#[derive(Debug, Default)]
pub struct EventInput {
    pub title: Option<String>,
    pub description: Option<String>,
    pub story_time: Option<String>,
    pub participants: Option<Vec<EventParticipant>>,
}

/// 故事线写入用的可选字段。
#[derive(Debug, Default)]
pub struct ArcInput {
    pub title: Option<String>,
    pub kind: Option<String>,
    pub summary: Option<String>,
}

/// 章节写入用的可选字段。
#[derive(Debug, Default)]
pub struct ChapterInput {
    pub title: Option<String>,
    pub status: Option<String>,
    pub summary: Option<String>,
    pub content: Option<String>,
    pub character_ids: Option<Vec<String>>,
    pub event_ids: Option<Vec<String>>,
}

/// 场景写入用的可选字段。
#[derive(Debug, Default)]
pub struct SceneInput {
    pub chapter_id: Option<String>,
    pub title: Option<String>,
    pub summary: Option<String>,
    pub story_time: Option<String>,
}

/// 笔记写入用的可选字段。
#[derive(Debug, Default)]
pub struct NoteInput {
    pub title: Option<String>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
}

fn require_distinct_pair(source_id: &str, target_id: &str) -> Result<(), ApiError> {
    crate::domain::require_distinct(source_id, target_id)
}

fn require_character(conn: &Connection, id: &str) -> Result<(), ApiError> {
    let found = conn
        .query_row(
            "SELECT 1 FROM characters WHERE id = ?1",
            [id],
            |row| row.get::<_, i64>(0),
        )
        .optional()
        .map_err(storage)?;
    if found.is_some() {
        Ok(())
    } else {
        Err(ApiError::not_found())
    }
}

fn get_character(conn: &Connection, id: &str) -> Result<Character, ApiError> {
    conn.query_row(
        "SELECT id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at
         FROM characters WHERE id = ?1",
        [id],
        map_character,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn save_character(conn: &Connection, character: &Character) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO characters (id, name, aliases_json, role, appearance, personality, goal, background, notes, status, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
         ON CONFLICT(id) DO UPDATE SET
            name = ?2, aliases_json = ?3, role = ?4, appearance = ?5, personality = ?6,
            goal = ?7, background = ?8, notes = ?9, status = ?10, updated_at = ?12",
        params![
            character.id,
            character.name,
            to_json(&character.aliases),
            character.role,
            character.appearance,
            character.personality,
            character.goal,
            character.background,
            character.notes,
            character.status,
            character.created_at,
            character.updated_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}

fn get_relation(conn: &Connection, id: &str) -> Result<Relation, ApiError> {
    conn.query_row(
        "SELECT id, source_id, target_id, type, description, is_directional, span, created_at, updated_at
         FROM relations WHERE id = ?1",
        [id],
        map_relation,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn save_relation(conn: &Connection, relation: &Relation) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO relations (id, source_id, target_id, type, description, is_directional, span, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
         ON CONFLICT(id) DO UPDATE SET
            source_id = ?2, target_id = ?3, type = ?4, description = ?5,
            is_directional = ?6, span = ?7, updated_at = ?9",
        params![
            relation.id,
            relation.source_id,
            relation.target_id,
            relation.r#type,
            relation.description,
            relation.directional as i64,
            relation.span,
            relation.created_at,
            relation.updated_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}

fn get_event(conn: &Connection, id: &str) -> Result<StoryEvent, ApiError> {
    let mut event = conn
        .query_row(
            "SELECT id, title, description, story_time, sort_order, created_at, updated_at FROM events WHERE id = ?1",
            [id],
            |row| {
                Ok(StoryEvent {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    description: row.get(2)?,
                    story_time: row.get(3)?,
                    sort_order: row.get(4)?,
                    participants: Vec::new(),
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::not_found)?;
    event.participants = participants(conn, id)?;
    Ok(event)
}

fn participants(conn: &Connection, event_id: &str) -> Result<Vec<EventParticipant>, ApiError> {
    let mut stmt = conn
        .prepare("SELECT character_id, role FROM event_participants WHERE event_id = ?1 ORDER BY character_id")
        .map_err(storage)?;
    let rows = stmt
        .query_map([event_id], |row| {
            Ok(EventParticipant {
                character_id: row.get(0)?,
                role: row.get(1)?,
            })
        })
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn replace_participants(conn: &Connection, event_id: &str, people: &[EventParticipant]) -> Result<(), ApiError> {
    let ids: Vec<String> = people.iter().map(|person| person.character_id.clone()).collect();
    require_unique(&ids)?;
    conn.execute("DELETE FROM event_participants WHERE event_id = ?1", [event_id])
        .map_err(storage)?;
    for person in people {
        conn.execute(
            "INSERT INTO event_participants (event_id, character_id, role) VALUES (?1, ?2, ?3)",
            params![event_id, person.character_id, person.role],
        )
        .map_err(storage)?;
    }
    Ok(())
}

fn ensure_characters(conn: &Connection, people: &[EventParticipant]) -> Result<(), ApiError> {
    for person in people {
        require_character(conn, &person.character_id)?;
    }
    Ok(())
}

fn get_arc(conn: &Connection, id: &str) -> Result<StoryArc, ApiError> {
    let mut arc = conn
        .query_row(
            "SELECT id, title, kind, summary, sort_order, created_at, updated_at FROM story_arcs WHERE id = ?1",
            [id],
            |row| {
                Ok(StoryArc {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    kind: row.get(2)?,
                    summary: row.get(3)?,
                    sort_order: row.get(4)?,
                    event_ids: Vec::new(),
                    created_at: row.get(5)?,
                    updated_at: row.get(6)?,
                })
            },
        )
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::not_found)?;
    arc.event_ids = arc_event_ids(conn, id)?;
    Ok(arc)
}

fn arc_event_ids(conn: &Connection, arc_id: &str) -> Result<Vec<String>, ApiError> {
    let mut stmt = conn
        .prepare("SELECT event_id FROM arc_events WHERE arc_id = ?1 ORDER BY sort_order")
        .map_err(storage)?;
    let rows = stmt
        .query_map([arc_id], |row| row.get(0))
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn get_chapter(conn: &Connection, id: &str) -> Result<Chapter, ApiError> {
    let mut chapter = conn
        .query_row(
            "SELECT id, title, status, summary, content, sort_order, created_at, updated_at FROM chapters WHERE id = ?1",
            [id],
            |row| {
                Ok(Chapter {
                    id: row.get(0)?,
                    title: row.get(1)?,
                    status: row.get(2)?,
                    summary: row.get(3)?,
                    content: row.get(4)?,
                    sort_order: row.get(5)?,
                    character_ids: Vec::new(),
                    event_ids: Vec::new(),
                    created_at: row.get(6)?,
                    updated_at: row.get(7)?,
                })
            },
        )
        .optional()
        .map_err(storage)?
        .ok_or_else(ApiError::not_found)?;
    chapter.character_ids = link_ids(conn, "chapter_characters", "character_id", id)?;
    chapter.event_ids = link_ids(conn, "chapter_events", "event_id", id)?;
    Ok(chapter)
}

fn link_ids(conn: &Connection, table: &str, column: &str, chapter_id: &str) -> Result<Vec<String>, ApiError> {
    let sql = format!("SELECT {column} FROM {table} WHERE chapter_id = ?1 ORDER BY {column}");
    let mut stmt = conn.prepare(&sql).map_err(storage)?;
    let rows = stmt
        .query_map([chapter_id], |row| row.get(0))
        .map_err(storage)?;
    rows.collect::<Result<Vec<_>, _>>().map_err(storage)
}

fn replace_links(
    conn: &Connection,
    table: &str,
    column: &str,
    chapter_id: &str,
    ids: &[String],
) -> Result<(), ApiError> {
    conn.execute(&format!("DELETE FROM {table} WHERE chapter_id = ?1"), [chapter_id])
        .map_err(storage)?;
    for id in ids {
        conn.execute(
            &format!("INSERT INTO {table} (chapter_id, {column}) VALUES (?1, ?2)"),
            params![chapter_id, id],
        )
        .map_err(storage)?;
    }
    Ok(())
}

fn get_scene(conn: &Connection, id: &str) -> Result<Scene, ApiError> {
    conn.query_row(
        "SELECT id, chapter_id, title, summary, story_time, sort_order, created_at, updated_at FROM scenes WHERE id = ?1",
        [id],
        map_scene,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn get_note(conn: &Connection, id: &str) -> Result<Note, ApiError> {
    conn.query_row(
        "SELECT id, title, content, tags_json, created_at, updated_at FROM notes WHERE id = ?1",
        [id],
        map_note,
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::not_found)
}

fn save_note(conn: &Connection, note: &Note) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO notes (id, title, content, tags_json, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)
         ON CONFLICT(id) DO UPDATE SET title = ?2, content = ?3, tags_json = ?4, updated_at = ?6",
        params![
            note.id,
            note.title,
            note.content,
            to_json(&note.tags),
            note.created_at,
            note.updated_at
        ],
    )
    .map_err(storage)?;
    Ok(())
}

fn delete_row(conn: &Connection, sql: &str, id: &str) -> Result<String, ApiError> {
    let changed = conn.execute(sql, [id]).map_err(storage)?;
    if changed == 0 {
        Err(ApiError::not_found())
    } else {
        Ok(id.to_string())
    }
}

fn next_sort(conn: &Connection, table: &str) -> Result<i64, ApiError> {
    conn.query_row(
        &format!("SELECT COALESCE(MAX(sort_order), 0) + 1 FROM {table}"),
        [],
        |row| row.get(0),
    )
    .map_err(storage)
}

fn push_hits(
    conn: &Connection,
    hits: &mut Vec<SearchHit>,
    kind: &str,
    sql: &str,
    query: &str,
) -> Result<(), ApiError> {
    let mut stmt = conn.prepare(sql).map_err(storage)?;
    let rows = stmt
        .query_map([query], |row| {
            Ok(SearchHit {
                kind: kind.to_string(),
                id: row.get(0)?,
                title: row.get(1)?,
            })
        })
        .map_err(storage)?;
    for row in rows {
        hits.push(row.map_err(storage)?);
    }
    Ok(())
}

fn map_project(row: &rusqlite::Row<'_>) -> rusqlite::Result<ProjectSummary> {
    Ok(ProjectSummary {
        id: row.get(0)?,
        name: row.get(1)?,
        description: row.get(2)?,
        path: row.get(3)?,
        updated_at: row.get(4)?,
        last_opened_at: row.get(5)?,
    })
}

fn map_character(row: &rusqlite::Row<'_>) -> rusqlite::Result<Character> {
    let aliases: String = row.get(2)?;
    Ok(Character {
        id: row.get(0)?,
        name: row.get(1)?,
        aliases: json_vec(&aliases),
        role: row.get(3)?,
        appearance: row.get(4)?,
        personality: row.get(5)?,
        goal: row.get(6)?,
        background: row.get(7)?,
        notes: row.get(8)?,
        status: row.get(9)?,
        created_at: row.get(10)?,
        updated_at: row.get(11)?,
    })
}

fn map_relation(row: &rusqlite::Row<'_>) -> rusqlite::Result<Relation> {
    let directional: i64 = row.get(5)?;
    Ok(Relation {
        id: row.get(0)?,
        source_id: row.get(1)?,
        target_id: row.get(2)?,
        r#type: row.get(3)?,
        description: row.get(4)?,
        directional: directional != 0,
        span: row.get(6)?,
        created_at: row.get(7)?,
        updated_at: row.get(8)?,
    })
}

fn map_scene(row: &rusqlite::Row<'_>) -> rusqlite::Result<Scene> {
    Ok(Scene {
        id: row.get(0)?,
        chapter_id: row.get(1)?,
        title: row.get(2)?,
        summary: row.get(3)?,
        story_time: row.get(4)?,
        sort_order: row.get(5)?,
        created_at: row.get(6)?,
        updated_at: row.get(7)?,
    })
}

fn map_note(row: &rusqlite::Row<'_>) -> rusqlite::Result<Note> {
    let tags: String = row.get(3)?;
    Ok(Note {
        id: row.get(0)?,
        title: row.get(1)?,
        content: row.get(2)?,
        tags: json_vec(&tags),
        created_at: row.get(4)?,
        updated_at: row.get(5)?,
    })
}

fn preference(conn: &Connection, key: &str) -> Result<String, ApiError> {
    conn.query_row(
        "SELECT value FROM preferences WHERE key = ?1",
        [key],
        |row| row.get(0),
    )
    .optional()
    .map_err(storage)?
    .ok_or_else(ApiError::storage)
}

fn set_preference(conn: &Connection, key: &str, value: &str) -> Result<(), ApiError> {
    conn.execute(
        "INSERT INTO preferences (key, value) VALUES (?1, ?2)
         ON CONFLICT(key) DO UPDATE SET value = ?2",
        params![key, value],
    )
    .map_err(storage)?;
    Ok(())
}

fn empty_layout() -> GraphLayout {
    GraphLayout {
        viewport: Viewport { x: 0.0, y: 0.0, zoom: 1.0 },
        nodes: BTreeMap::new(),
        updated_at: now(),
    }
}

fn blank_to_null(value: Option<String>) -> Option<String> {
    value.and_then(|text| {
        let trimmed = text.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}

fn json_vec(text: &str) -> Vec<String> {
    serde_json::from_str(text).unwrap_or_default()
}

fn to_json(values: &[String]) -> String {
    serde_json::to_string(values).unwrap_or_else(|_| "[]".into())
}

fn new_id() -> String {
    ulid::Ulid::new().to_string()
}

fn now() -> String {
    chrono::Utc::now().format("%Y-%m-%dT%H:%M:%SZ").to_string()
}

fn storage<E: std::fmt::Display>(err: E) -> ApiError {
    eprintln!("storage: {err}");
    ApiError::storage()
}

fn migration<E: std::fmt::Display>(err: E) -> ApiError {
    eprintln!("migration: {err}");
    ApiError::migration()
}

fn backup_err<E: std::fmt::Display>(err: E) -> ApiError {
    eprintln!("backup: {err}");
    ApiError::backup()
}

/// 项目文件所在目录。
///
/// * `data_dir` - 应用数据目录。
pub fn project_dir(data_dir: &Path) -> PathBuf {
    data_dir.join("projects")
}

/// 某个项目的快照目录。
///
/// * `data_dir` - 应用数据目录。
/// * `project_id` - 项目 id。
pub fn backup_dir(data_dir: &Path, project_id: &str) -> PathBuf {
    data_dir.join("backups").join(project_id)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn deleting_a_character_removes_relations_and_keeps_events() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        migrate(&conn).unwrap();
        let a = create_character(&conn, CharacterInput { name: Some("甲".into()), ..CharacterInput::default() }).unwrap();
        let b = create_character(&conn, CharacterInput { name: Some("乙".into()), ..CharacterInput::default() }).unwrap();
        create_relation(
            &conn,
            RelationInput {
                source_id: Some(a.id.clone()),
                target_id: Some(b.id.clone()),
                r#type: Some("同门".into()),
                ..RelationInput::default()
            },
        )
        .unwrap();
        create_event(
            &conn,
            EventInput {
                title: Some("相遇".into()),
                participants: Some(vec![EventParticipant { character_id: a.id.clone(), role: "在场".into() }]),
                ..EventInput::default()
            },
        )
        .unwrap();
        delete_character(&conn, &a.id).unwrap();
        assert!(list_relations(&conn).unwrap().is_empty());
        let events = list_events(&conn).unwrap();
        assert_eq!(events.len(), 1);
        assert!(events[0].participants.is_empty());
    }
}
