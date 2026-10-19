//! 进程内状态：应用库、当前打开的项目库、插件宿主。

use crate::db;
use crate::error::ApiError;
use crate::models::{ProjectSummary, Recovery, Snapshot};
use crate::plugins::PluginHost;
use rusqlite::Connection;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

/// 一个已经打开的项目库。
pub struct OpenProject {
    pub id: String,
    pub conn: Connection,
}

/// 整个应用共享的状态。连接都包在锁里，命令之间不会交错写同一个库。
pub struct AppState {
    pub app: Mutex<Connection>,
    pub open: Mutex<Option<OpenProject>>,
    pub plugins: PluginHost,
    pub data_dir: PathBuf,
    /// 本次进程是否已经记下「上次退出是否干净」。
    session_started: Mutex<bool>,
}

impl AppState {
    /// 装好应用库和插件宿主。项目库等到打开某个项目再连。
    ///
    /// * `app` - 已经迁移过的应用库。
    /// * `data_dir` - 应用数据目录。项目文件和快照都放在这里。
    pub fn new(app: Connection, data_dir: PathBuf) -> Self {
        Self {
            app: Mutex::new(app),
            open: Mutex::new(None),
            plugins: crate::plugins::install(),
            data_dir,
            session_started: Mutex::new(false),
        }
    }

    /// 打开或切到指定项目，然后在它的连接上执行 `f`。
    ///
    /// * `project_id` - 项目 id。
    /// * `f` - 拿到项目库连接后的操作。
    ///
    /// 项目不在最近列表里时返回 `NOT_FOUND`。
    pub fn with_project<T>(
        &self,
        project_id: &str,
        f: impl FnOnce(&Connection) -> Result<T, ApiError>,
    ) -> Result<T, ApiError> {
        self.ensure_open(project_id)?;
        let guard = self.open.lock().map_err(|_| ApiError::storage())?;
        let open = guard.as_ref().ok_or_else(ApiError::not_found)?;
        if open.id != project_id {
            return Err(ApiError::not_found());
        }
        f(&open.conn)
    }

    /// 关掉当前项目库。id 不一致时不做任何事。
    ///
    /// * `project_id` - 要关闭的项目。
    pub fn close_project(&self, project_id: &str) -> Result<(), ApiError> {
        let mut slot = self.open.lock().map_err(|_| ApiError::storage())?;
        if slot.as_ref().is_some_and(|open| open.id == project_id) {
            *slot = None;
        }
        Ok(())
    }

    /// 为项目做一份快照，并只保留最近 10 份。
    ///
    /// * `project_id` - 项目 id。
    ///
    /// 返回快照时间和文件路径。
    pub fn create_backup(&self, project_id: &str) -> Result<Snapshot, ApiError> {
        let summary = {
            let app = self.app.lock().map_err(|_| ApiError::storage())?;
            db::get_project(&app, project_id)?
        };
        self.ensure_open(project_id)?;
        let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%SZ").to_string();
        let dir = db::backup_dir(&self.data_dir, project_id);
        let dest = dir.join(format!("{stamp}.sqlite"));
        {
            let guard = self.open.lock().map_err(|_| ApiError::storage())?;
            let open = guard.as_ref().ok_or_else(ApiError::not_found)?;
            db::backup_to(&open.conn, &dest)?;
        }
        db::prune_snapshots(&dir)?;
        let _ = summary;
        Ok(Snapshot {
            snapshot_at: stamp,
            path: dest.display().to_string(),
        })
    }

    /// 列出项目的快照，新的在前。
    ///
    /// * `project_id` - 项目 id。
    pub fn list_backups(&self, project_id: &str) -> Result<Vec<Snapshot>, ApiError> {
        let dir = db::backup_dir(&self.data_dir, project_id);
        Ok(db::prune_snapshots(&dir)?
            .into_iter()
            .map(|stamp| Snapshot {
                path: dir.join(format!("{stamp}.sqlite")).display().to_string(),
                snapshot_at: stamp,
            })
            .collect())
    }

    /// 用快照替换项目库。替换前先再做一份当前库的快照。
    ///
    /// * `project_id` - 项目 id。
    /// * `snapshot_at` - 要恢复的快照时间。
    ///
    /// 校验失败时当前库保持原样，并返回 `BACKUP_ERROR`。
    pub fn restore_backup(&self, project_id: &str, snapshot_at: &str) -> Result<ProjectSummary, ApiError> {
        let summary = {
            let app = self.app.lock().map_err(|_| ApiError::storage())?;
            db::get_project(&app, project_id)?
        };
        let dir = db::backup_dir(&self.data_dir, project_id);
        let source = dir.join(format!("{snapshot_at}.sqlite"));
        if !source.is_file() {
            return Err(ApiError::backup());
        }
        self.close_project(project_id)?;
        let safety = dir.join(format!("before-{}.sqlite", chrono::Utc::now().format("%Y%m%dT%H%M%SZ")));
        let project_path = PathBuf::from(&summary.path);
        if let Ok(current) = db::connect(&project_path) {
            db::backup_to(&current, &safety)?;
        }
        if fs::copy(&source, &project_path).is_err() {
            return Err(ApiError::backup());
        }
        match db::connect(&project_path).and_then(|conn| db::migrate(&conn).map(|_| conn)) {
            Ok(_) => {
                let _ = fs::remove_file(&safety);
                let app = self.app.lock().map_err(|_| ApiError::storage())?;
                db::mark_opened(&app, project_id)
            }
            Err(error) => {
                if safety.is_file() {
                    let _ = fs::copy(&safety, &project_path);
                }
                Err(error)
            }
        }
    }

    /// 本次进程第一次调用时记下上次是否正常退出。之后再读不会重复改标记。
    ///
    /// 返回上次退出是否正常。
    pub fn take_previous_clean(&self) -> Result<bool, ApiError> {
        let mut started = self.session_started.lock().map_err(|_| ApiError::storage())?;
        if *started {
            return Ok(true);
        }
        let app = self.app.lock().map_err(|_| ApiError::storage())?;
        let clean = db::begin_session(&app)?;
        *started = true;
        Ok(clean)
    }

    /// 判断要不要询问恢复。
    ///
    /// * `previous_clean` - 上次退出是否正常。
    pub fn recovery(&self, previous_clean: bool) -> Result<Recovery, ApiError> {
        if previous_clean {
            return Ok(Recovery { needed: false, project_id: None, snapshot_at: None });
        }
        let (project_id, skip) = {
            let app = self.app.lock().map_err(|_| ApiError::storage())?;
            let recent = db::list_projects(&app)?;
            let skip = db::recovery_skip(&app)?;
            (recent.into_iter().next().map(|item| item.id), skip)
        };
        let Some(project_id) = project_id else {
            return Ok(Recovery { needed: false, project_id: None, snapshot_at: None });
        };
        let snapshot_at = db::latest_snapshot(&db::backup_dir(&self.data_dir, &project_id));
        let Some(snapshot_at) = snapshot_at else {
            return Ok(Recovery { needed: false, project_id: None, snapshot_at: None });
        };
        let token = format!("{project_id}:{snapshot_at}");
        if skip == token {
            return Ok(Recovery { needed: false, project_id: None, snapshot_at: None });
        }
        Ok(Recovery {
            needed: true,
            project_id: Some(project_id),
            snapshot_at: Some(snapshot_at),
        })
    }

    pub fn ensure_open(&self, project_id: &str) -> Result<(), ApiError> {
        {
            let slot = self.open.lock().map_err(|_| ApiError::storage())?;
            if slot.as_ref().is_some_and(|open| open.id == project_id) {
                return Ok(());
            }
        }
        let path = {
            let app = self.app.lock().map_err(|_| ApiError::storage())?;
            PathBuf::from(db::get_project(&app, project_id)?.path)
        };
        let conn = db::connect(&path)?;
        db::migrate(&conn)?;
        let mut slot = self.open.lock().map_err(|_| ApiError::storage())?;
        *slot = Some(OpenProject {
            id: project_id.to_string(),
            conn,
        });
        Ok(())
    }
}

/// 应用数据目录下的应用库路径。
///
/// * `data_dir` - Tauri 给出的应用数据目录。
pub fn app_db_path(data_dir: &Path) -> PathBuf {
    data_dir.join("app.sqlite")
}
