//! Tauri 命令。每个函数只校验并转交数据库，不在这里写规则。
//!
//! 参数在 JSON 里使用驼峰。成功和失败都放进 [`CommandResult`](crate::error::CommandResult)。

use crate::db::{self, ArcInput, ChapterInput, CharacterInput, EventInput, NoteInput, RelationInput, SceneInput};
use crate::error::CommandResult;
use crate::models::*;
use crate::state::AppState;
use std::collections::BTreeMap;
use tauri::State;

/// 读取主题、最近项目，以及是否需要询问恢复。
///
/// 返回 [`AppStateDto`]。不写项目库。
#[tauri::command]
pub fn app_get_state(state: State<'_, AppState>) -> CommandResult<AppStateDto> {
    CommandResult::from_result((|| {
        let previous_clean = state.take_previous_clean()?;
        let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
        let theme = db::theme(&app)?;
        let recent = db::list_projects(&app)?;
        drop(app);
        let recovery = state.recovery(previous_clean)?;
        Ok(AppStateDto { theme, recent, recovery })
    })())
}

/// 保存主题。
///
/// * `theme` - `paper` 或 `ink`。
///
/// 返回保存后的主题。其他取值返回 `VALIDATION_ERROR`。
#[tauri::command]
pub fn app_set_theme(state: State<'_, AppState>, theme: String) -> CommandResult<ThemeSet> {
    CommandResult::from_result((|| {
        let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
        Ok(ThemeSet { theme: db::set_theme(&app, &theme)? })
    })())
}

/// 作者选择保持现状，不再对这一份快照重复询问。
///
/// * `project_id` - 恢复提示里的项目。
/// * `snapshot_at` - 恢复提示里的快照时间。
///
/// 返回 `{ dismissed: true }`。
#[tauri::command(rename_all = "camelCase")]
pub fn app_dismiss_recovery(
    state: State<'_, AppState>,
    project_id: String,
    snapshot_at: String,
) -> CommandResult<serde_json::Value> {
    CommandResult::from_result((|| {
        let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
        db::skip_recovery(&app, &format!("{project_id}:{snapshot_at}"))?;
        Ok(serde_json::json!({ "dismissed": true }))
    })())
}

/// 已注册的进程内插件。
///
/// 返回插件 id 和名称。
#[tauri::command]
pub fn plugin_list(state: State<'_, AppState>) -> CommandResult<Vec<crate::plugins::PluginInfo>> {
    CommandResult::ok(state.plugins.list())
}

/// 最近项目，最近打开的在前。
#[tauri::command]
pub fn project_list(state: State<'_, AppState>) -> CommandResult<Vec<ProjectSummary>> {
    CommandResult::from_result((|| {
        let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
        db::list_projects(&app)
    })())
}

/// 新建项目。
///
/// * `name` - 名称，不能为空白。
/// * `description` - 简介，可省略。
///
/// 返回项目摘要。空白名称返回 `EMPTY_NAME`。
#[tauri::command(rename_all = "camelCase")]
pub fn project_create(
    state: State<'_, AppState>,
    name: String,
    description: Option<String>,
) -> CommandResult<ProjectSummary> {
    CommandResult::from_result((|| {
        let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
        db::create_project(
            &app,
            &db::project_dir(&state.data_dir),
            &name,
            description.as_deref().unwrap_or(""),
        )
    })())
}

/// 打开项目，并把它排到最近列表的前面。
///
/// * `id` - 项目 id。
///
/// 返回项目摘要。不存在时返回 `NOT_FOUND`。
#[tauri::command]
pub fn project_open(state: State<'_, AppState>, id: String) -> CommandResult<ProjectSummary> {
    CommandResult::from_result((|| {
        state.ensure_open(&id)?;
        let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
        db::mark_opened(&app, &id)
    })())
}

/// 修改项目名称或简介。
///
/// * `id` - 项目 id。
/// * `name` - 新名称。省略则不改。
/// * `description` - 新简介。省略则不改。
#[tauri::command(rename_all = "camelCase")]
pub fn project_update(
    state: State<'_, AppState>,
    id: String,
    name: Option<String>,
    description: Option<String>,
) -> CommandResult<ProjectSummary> {
    CommandResult::from_result((|| {
        update_open_project(&state, &id, name.as_deref(), description.as_deref())
    })())
}

/// 关闭当前打开的项目库。文件仍留在磁盘上。
///
/// * `id` - 项目 id。
///
/// 返回 `{ closed: true }`。
#[tauri::command]
pub fn project_close(state: State<'_, AppState>, id: String) -> CommandResult<Closed> {
    CommandResult::from_result(state.close_project(&id).map(|_| Closed { closed: true }))
}

/// 人物列表。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn character_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<Character>> {
    CommandResult::from_result(state.with_project(&project_id, db::list_characters))
}

/// 新增人物。
///
/// * `project_id` - 项目 id。
/// * `name` - 姓名。
/// * 其余字段可省略。
#[tauri::command(rename_all = "camelCase")]
pub fn character_create(
    state: State<'_, AppState>,
    project_id: String,
    name: String,
    aliases: Option<Vec<String>>,
    role: Option<String>,
    appearance: Option<String>,
    personality: Option<String>,
    goal: Option<String>,
    background: Option<String>,
    notes: Option<String>,
    status: Option<String>,
) -> CommandResult<Character> {
    let input = CharacterInput { name: Some(name), aliases, role, appearance, personality, goal, background, notes, status };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_character(conn, input)))
}

/// 修改人物。省略的字段保持原值。
///
/// * `project_id` - 项目 id。
/// * `id` - 人物 id。
#[tauri::command(rename_all = "camelCase")]
pub fn character_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    name: Option<String>,
    aliases: Option<Vec<String>>,
    role: Option<String>,
    appearance: Option<String>,
    personality: Option<String>,
    goal: Option<String>,
    background: Option<String>,
    notes: Option<String>,
    status: Option<String>,
) -> CommandResult<Character> {
    let input = CharacterInput { name, aliases, role, appearance, personality, goal, background, notes, status };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_character(conn, &id, input)))
}

/// 删除人物及其关系。章节和事件保留。
///
/// * `project_id` - 项目 id。
/// * `id` - 人物 id。
///
/// 返回被删除的 id。
#[tauri::command(rename_all = "camelCase")]
pub fn character_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_character(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 关系列表。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn relation_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<Relation>> {
    CommandResult::from_result(state.with_project(&project_id, db::list_relations))
}

/// 建立关系。
///
/// * `source_id` - 起点人物。
/// * `target_id` - 终点人物。不能与起点相同。
/// * `type` - 关系类型。
#[tauri::command(rename_all = "camelCase")]
pub fn relation_create(
    state: State<'_, AppState>,
    project_id: String,
    source_id: String,
    target_id: String,
    r#type: Option<String>,
    description: Option<String>,
    directional: Option<bool>,
    span: Option<String>,
) -> CommandResult<Relation> {
    let input = RelationInput {
        source_id: Some(source_id),
        target_id: Some(target_id),
        r#type,
        description,
        directional,
        span,
    };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_relation(conn, input)))
}

/// 修改关系。
///
/// * `project_id` - 项目 id。
/// * `id` - 关系 id。
#[tauri::command(rename_all = "camelCase")]
pub fn relation_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    source_id: Option<String>,
    target_id: Option<String>,
    r#type: Option<String>,
    description: Option<String>,
    directional: Option<bool>,
    span: Option<String>,
) -> CommandResult<Relation> {
    let input = RelationInput { source_id, target_id, r#type, description, directional, span };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_relation(conn, &id, input)))
}

/// 删除关系。
///
/// * `project_id` - 项目 id。
/// * `id` - 关系 id。
#[tauri::command(rename_all = "camelCase")]
pub fn relation_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_relation(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 读取图谱布局。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn graph_layout_get(state: State<'_, AppState>, project_id: String) -> CommandResult<GraphLayout> {
    CommandResult::from_result(state.with_project(&project_id, db::get_layout))
}

/// 保存视口，并合并本次移动的节点。
///
/// * `project_id` - 项目 id。
/// * `viewport` - 缩放和平移。
/// * `nodes` - 改动过的节点坐标。未出现的节点保持原坐标。
#[tauri::command(rename_all = "camelCase")]
pub fn graph_layout_save(
    state: State<'_, AppState>,
    project_id: String,
    viewport: Viewport,
    nodes: BTreeMap<String, NodePos>,
) -> CommandResult<GraphLayout> {
    CommandResult::from_result(state.with_project(&project_id, |conn| db::save_layout(conn, viewport, nodes)))
}

/// 事件列表，按故事内顺序。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn event_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<StoryEvent>> {
    CommandResult::from_result(state.with_project(&project_id, db::list_events))
}

/// 新增事件。
///
/// * `project_id` - 项目 id。
/// * `title` - 标题。
#[tauri::command(rename_all = "camelCase")]
pub fn event_create(
    state: State<'_, AppState>,
    project_id: String,
    title: String,
    description: Option<String>,
    story_time: Option<String>,
    participants: Option<Vec<EventParticipant>>,
) -> CommandResult<StoryEvent> {
    let input = EventInput { title: Some(title), description, story_time, participants };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_event(conn, input)))
}

/// 修改事件。
///
/// * `project_id` - 项目 id。
/// * `id` - 事件 id。
#[tauri::command(rename_all = "camelCase")]
pub fn event_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    title: Option<String>,
    description: Option<String>,
    story_time: Option<String>,
    participants: Option<Vec<EventParticipant>>,
) -> CommandResult<StoryEvent> {
    let input = EventInput { title, description, story_time, participants };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_event(conn, &id, input)))
}

/// 删除事件。故事线和章节只解除引用。
///
/// * `project_id` - 项目 id。
/// * `id` - 事件 id。
#[tauri::command(rename_all = "camelCase")]
pub fn event_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_event(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 重排事件。`ids` 必须包含全部事件且不能重复。
///
/// * `project_id` - 项目 id。
/// * `ids` - 新顺序。
#[tauri::command(rename_all = "camelCase")]
pub fn event_reorder(state: State<'_, AppState>, project_id: String, ids: Vec<String>) -> CommandResult<Vec<StoryEvent>> {
    CommandResult::from_result(state.with_project(&project_id, |conn| db::reorder_events(conn, &ids)))
}

/// 故事线列表。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn story_arc_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<StoryArc>> {
    CommandResult::from_result(state.with_project(&project_id, db::list_arcs))
}

/// 新建故事线。
///
/// * `project_id` - 项目 id。
/// * `title` - 标题。
/// * `kind` - 主线、支线、人物线或感情线。可省略。
#[tauri::command(rename_all = "camelCase")]
pub fn story_arc_create(
    state: State<'_, AppState>,
    project_id: String,
    title: String,
    kind: Option<String>,
    summary: Option<String>,
) -> CommandResult<StoryArc> {
    let input = ArcInput { title: Some(title), kind, summary };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_arc(conn, input)))
}

/// 修改故事线的标题、类型或简介。
///
/// * `project_id` - 项目 id。
/// * `id` - 故事线 id。
#[tauri::command(rename_all = "camelCase")]
pub fn story_arc_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    title: Option<String>,
    kind: Option<String>,
    summary: Option<String>,
) -> CommandResult<StoryArc> {
    let input = ArcInput { title, kind, summary };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_arc(conn, &id, input)))
}

/// 删除故事线。事件保留。
///
/// * `project_id` - 项目 id。
/// * `id` - 故事线 id。
#[tauri::command(rename_all = "camelCase")]
pub fn story_arc_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_arc(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 替换一条故事线里的事件顺序。
///
/// * `project_id` - 项目 id。
/// * `id` - 故事线 id。
/// * `event_ids` - 新顺序。
#[tauri::command(rename_all = "camelCase")]
pub fn story_arc_set_events(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    event_ids: Vec<String>,
) -> CommandResult<StoryArc> {
    CommandResult::from_result(state.with_project(&project_id, |conn| db::set_arc_events(conn, &id, &event_ids)))
}

/// 章节列表，按叙述顺序。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn chapter_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<Chapter>> {
    CommandResult::from_result(state.with_project(&project_id, db::list_chapters))
}

/// 新建章节。
///
/// * `project_id` - 项目 id。
/// * `title` - 标题。
#[tauri::command(rename_all = "camelCase")]
pub fn chapter_create(
    state: State<'_, AppState>,
    project_id: String,
    title: String,
    status: Option<String>,
    summary: Option<String>,
    content: Option<String>,
) -> CommandResult<Chapter> {
    let input = ChapterInput { title: Some(title), status, summary, content, ..ChapterInput::default() };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_chapter(conn, input)))
}

/// 修改章节。`content` 保存 Markdown 原文。
///
/// * `project_id` - 项目 id。
/// * `id` - 章节 id。
#[tauri::command(rename_all = "camelCase")]
pub fn chapter_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    title: Option<String>,
    status: Option<String>,
    summary: Option<String>,
    content: Option<String>,
    character_ids: Option<Vec<String>>,
    event_ids: Option<Vec<String>>,
) -> CommandResult<Chapter> {
    let input = ChapterInput { title, status, summary, content, character_ids, event_ids };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_chapter(conn, &id, input)))
}

/// 删除章节及其场景。
///
/// * `project_id` - 项目 id。
/// * `id` - 章节 id。
#[tauri::command(rename_all = "camelCase")]
pub fn chapter_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_chapter(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 重排章节。
///
/// * `project_id` - 项目 id。
/// * `ids` - 新的叙述顺序。
#[tauri::command(rename_all = "camelCase")]
pub fn chapter_reorder(state: State<'_, AppState>, project_id: String, ids: Vec<String>) -> CommandResult<Vec<Chapter>> {
    CommandResult::from_result(state.with_project(&project_id, |conn| db::reorder_chapters(conn, &ids)))
}

/// 某一章的场景。
///
/// * `project_id` - 项目 id。
/// * `chapter_id` - 章节 id。
#[tauri::command(rename_all = "camelCase")]
pub fn scene_list(state: State<'_, AppState>, project_id: String, chapter_id: String) -> CommandResult<Vec<Scene>> {
    CommandResult::from_result(state.with_project(&project_id, |conn| db::list_scenes(conn, &chapter_id)))
}

/// 新增场景。
///
/// * `project_id` - 项目 id。
/// * `chapter_id` - 所属章节。
/// * `title` - 标题。
#[tauri::command(rename_all = "camelCase")]
pub fn scene_create(
    state: State<'_, AppState>,
    project_id: String,
    chapter_id: String,
    title: String,
    summary: Option<String>,
    story_time: Option<String>,
) -> CommandResult<Scene> {
    let input = SceneInput { chapter_id: Some(chapter_id), title: Some(title), summary, story_time };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_scene(conn, input)))
}

/// 修改场景。
///
/// * `project_id` - 项目 id。
/// * `id` - 场景 id。
#[tauri::command(rename_all = "camelCase")]
pub fn scene_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    title: Option<String>,
    summary: Option<String>,
    story_time: Option<String>,
) -> CommandResult<Scene> {
    let input = SceneInput { title, summary, story_time, ..SceneInput::default() };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_scene(conn, &id, input)))
}

/// 删除场景。
///
/// * `project_id` - 项目 id。
/// * `id` - 场景 id。
#[tauri::command(rename_all = "camelCase")]
pub fn scene_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_scene(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 笔记列表。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn note_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<Note>> {
    CommandResult::from_result(state.with_project(&project_id, db::list_notes))
}

/// 新建笔记。
///
/// * `project_id` - 项目 id。
/// * `title` - 标题。
#[tauri::command(rename_all = "camelCase")]
pub fn note_create(
    state: State<'_, AppState>,
    project_id: String,
    title: String,
    content: Option<String>,
    tags: Option<Vec<String>>,
) -> CommandResult<Note> {
    let input = NoteInput { title: Some(title), content, tags };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::create_note(conn, input)))
}

/// 修改笔记。
///
/// * `project_id` - 项目 id。
/// * `id` - 笔记 id。
#[tauri::command(rename_all = "camelCase")]
pub fn note_update(
    state: State<'_, AppState>,
    project_id: String,
    id: String,
    title: Option<String>,
    content: Option<String>,
    tags: Option<Vec<String>>,
) -> CommandResult<Note> {
    let input = NoteInput { title, content, tags };
    CommandResult::from_result(state.with_project(&project_id, |conn| db::update_note(conn, &id, input)))
}

/// 删除笔记。
///
/// * `project_id` - 项目 id。
/// * `id` - 笔记 id。
#[tauri::command(rename_all = "camelCase")]
pub fn note_delete(state: State<'_, AppState>, project_id: String, id: String) -> CommandResult<Deleted> {
    CommandResult::from_result(
        state.with_project(&project_id, |conn| db::delete_note(conn, &id).map(|deleted_id| Deleted { deleted_id })),
    )
}

/// 搜索人物、事件、故事线、章节和笔记。
///
/// * `project_id` - 项目 id。
/// * `query` - 关键字。空白时返回空数组。
#[tauri::command(rename_all = "camelCase")]
pub fn search_query(state: State<'_, AppState>, project_id: String, query: String) -> CommandResult<Vec<SearchHit>> {
    CommandResult::from_result(state.with_project(&project_id, |conn| db::search(conn, &query)))
}

/// 为项目做一份快照。
///
/// * `project_id` - 项目 id。
///
/// 返回快照时间和路径。
#[tauri::command(rename_all = "camelCase")]
pub fn backup_create(state: State<'_, AppState>, project_id: String) -> CommandResult<Snapshot> {
    CommandResult::from_result(state.create_backup(&project_id))
}

/// 列出项目的快照，最多 10 条，新的在前。
///
/// * `project_id` - 项目 id。
#[tauri::command(rename_all = "camelCase")]
pub fn backup_list(state: State<'_, AppState>, project_id: String) -> CommandResult<Vec<Snapshot>> {
    CommandResult::from_result(state.list_backups(&project_id))
}

/// 先改项目库，再改应用库。两把锁不会同时拿着。
fn update_open_project(
    state: &AppState,
    id: &str,
    name: Option<&str>,
    description: Option<&str>,
) -> Result<ProjectSummary, crate::error::ApiError> {
    state.ensure_open(id)?;
    let app = state.app.lock().map_err(|_| crate::error::ApiError::storage())?;
    let guard = state.open.lock().map_err(|_| crate::error::ApiError::storage())?;
    let open = guard.as_ref().ok_or_else(crate::error::ApiError::not_found)?;
    db::update_project(&app, &open.conn, id, name, description)
}

/// 用快照替换项目库。失败时当前项目保持原样。
///
/// * `project_id` - 项目 id。
/// * `snapshot_at` - 快照时间。
#[tauri::command(rename_all = "camelCase")]
pub fn backup_restore(
    state: State<'_, AppState>,
    project_id: String,
    snapshot_at: String,
) -> CommandResult<ProjectSummary> {
    CommandResult::from_result(state.restore_backup(&project_id, &snapshot_at))
}
