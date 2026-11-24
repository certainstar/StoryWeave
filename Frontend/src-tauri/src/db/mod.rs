//! SQLite 访问。每个小说项目一个文件，应用偏好另放一份库。
//!
//! 规则判断在 `domain`。这里只负责读写，并保证外键生效。

mod arcs;
mod backup;
mod bootstrap;
mod chapters;
mod characters;
mod events;
mod guards;
mod inputs;
mod layout;
mod maps;
mod notes;
mod prefs;
mod projects;
mod relations;
mod scenes;
mod search;
mod support;
mod vocab_ext;

pub use arcs::{create_arc, delete_arc, list_arcs, reorder_arcs, set_arc_events, update_arc};
pub use chapters::{create_chapter, delete_chapter, list_chapters, reorder_chapters, update_chapter};
pub use characters::{create_character, delete_character, list_characters, update_character};
pub use events::{create_event, delete_event, list_events, reorder_events, update_event};
pub use inputs::{
    ArcInput, ChapterInput, CharacterInput, EventInput, NoteInput, RelationInput, SceneInput,
};
pub use layout::{get_layout, save_layout};
pub use notes::{create_note, delete_note, list_notes, reorder_notes, update_note};
pub use relations::{create_relation, delete_relation, list_relations, update_relation};
pub use scenes::{create_scene, delete_scene, list_scenes, reorder_scenes, update_scene};
pub use backup::{backup_dir, backup_to, latest_snapshot, project_dir, prune_snapshots};
pub use projects::{
    create_project, delete_project, get_project, list_projects, mark_opened, update_project,
};
pub use search::search;
pub use vocab_ext::{ensure_label, list_vocab};
pub use bootstrap::{connect, migrate, migrate_app};

pub use prefs::{
    begin_session, leave_draft, mark_clean, recovery_skip, set_leave_draft, set_theme, skip_recovery, theme,
};

#[cfg(test)]
mod tests {
    use super::{
        create_character, create_event, create_relation, delete_character, list_events, list_relations, migrate,
        CharacterInput, EventInput, RelationInput,
    };
    use crate::models::EventParticipant;
    use rusqlite::Connection;

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

    #[test]
    fn migrate_old_notes_without_sort_order_column() {
        let conn = Connection::open_in_memory().unwrap();
        conn.execute_batch("PRAGMA foreign_keys = ON;").unwrap();
        conn.execute_batch(
            "
            CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
            INSERT INTO schema_migrations (version, applied_at) VALUES (1, '2020-01-01');
            CREATE TABLE notes (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                tags_json TEXT NOT NULL DEFAULT '[]',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            ",
        )
        .unwrap();
        migrate(&conn).unwrap();
        let sort_order: i64 = conn
            .query_row(
                "SELECT sort_order FROM notes LIMIT 1",
                [],
                |row| row.get(0),
            )
            .unwrap_or(0);
        let _ = sort_order;
        let index_count: i64 = conn
            .query_row(
                "SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = 'idx_notes_sort'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(index_count, 1);
    }
}
