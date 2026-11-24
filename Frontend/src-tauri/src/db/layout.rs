//! 关系图布局。

use super::support::{empty_layout, now, storage};
use crate::error::ApiError;
use crate::models::{GraphLayout, NodePos, Viewport};
use rusqlite::{params, Connection, OptionalExtension};
use std::collections::BTreeMap;

/// 读取图谱布局。
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

/// 保存视口，并合并节点坐标。
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