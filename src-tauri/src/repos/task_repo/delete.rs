use rusqlite::{types::Value, Connection};

use crate::db::now_ms;
use crate::types::error::AppError;

use super::stats;

pub fn delete_many(conn: &mut Connection, ids: &[String]) -> Result<usize, AppError> {
    if ids.is_empty() {
        return Err(AppError::Validation("请选择要删除的任务".to_string()));
    }

    let now = now_ms();
    let tx = conn.transaction()?;

    let placeholders = ids.iter().map(|_| "?").collect::<Vec<_>>().join(",");
    let id_values: Vec<Value> = ids.iter().map(|s| Value::Text(s.clone())).collect();

    let project_ids = {
        let mut stmt = tx.prepare(&format!(
            "SELECT project_id FROM tasks WHERE id IN ({})",
            placeholders
        ))?;
        let project_rows = stmt.query_map(rusqlite::params_from_iter(id_values.iter()), |row| {
            row.get::<_, Option<String>>(0)
        })?;

        let mut project_ids = Vec::new();
        for row in project_rows {
            if let Some(project_id) = row? {
                project_ids.push(project_id);
            }
        }
        project_ids
    };

    let sql = format!("DELETE FROM tasks WHERE id IN ({})", placeholders);
    let changed = tx.execute(&sql, rusqlite::params_from_iter(id_values.iter()))?;

    for project_id in project_ids {
        stats::refresh_project_stats(&tx, &project_id, now)?;
    }

    tx.commit()?;
    Ok(changed)
}
