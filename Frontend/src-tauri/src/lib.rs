//! 墨织桌面进程。窗口里的页面通过命令读写本机 SQLite，不另开服务。

mod commands;
mod db;
mod domain;
mod error;
mod models;
mod plugins;
mod state;

use state::{app_db_path, AppState};
use tauri::Manager;

/// 启动应用，打开应用库，并注册全部命令。
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let data_dir = app.path().app_data_dir()?;
            std::fs::create_dir_all(&data_dir)?;
            let db_path = app_db_path(&data_dir);
            let conn = db::connect(&db_path).map_err(|err| err.message)?;
            db::migrate_app(&conn).map_err(|err| err.message)?;
            app.manage(AppState::new(conn, data_dir));
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                if let Some(app_state) = window.try_state::<AppState>() {
                    if let Ok(conn) = app_state.app.lock() {
                        let _ = db::mark_clean(&conn);
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::app_get_state,
            commands::app_set_theme,
            commands::app_dismiss_recovery,
            commands::plugin_list,
            commands::project_list,
            commands::project_create,
            commands::project_open,
            commands::project_update,
            commands::project_close,
            commands::character_list,
            commands::character_create,
            commands::character_update,
            commands::character_delete,
            commands::relation_list,
            commands::relation_create,
            commands::relation_update,
            commands::relation_delete,
            commands::graph_layout_get,
            commands::graph_layout_save,
            commands::event_list,
            commands::event_create,
            commands::event_update,
            commands::event_delete,
            commands::event_reorder,
            commands::story_arc_list,
            commands::story_arc_create,
            commands::story_arc_update,
            commands::story_arc_delete,
            commands::story_arc_set_events,
            commands::chapter_list,
            commands::chapter_create,
            commands::chapter_update,
            commands::chapter_delete,
            commands::chapter_reorder,
            commands::scene_list,
            commands::scene_create,
            commands::scene_update,
            commands::scene_delete,
            commands::note_list,
            commands::note_create,
            commands::note_update,
            commands::note_delete,
            commands::search_query,
            commands::backup_create,
            commands::backup_list,
            commands::backup_restore,
        ])
        .run(tauri::generate_context!())
        .expect("墨织没有启动");
}
