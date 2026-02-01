use rusqlite::Connection;

use crate::types::error::AppError;

struct Migration {
    version: i64,
    sql: &'static str,
}

const MIGRATIONS: &[Migration] = &[
    Migration {
        version: 1,
        sql: include_str!("migrations/0001_init.sql"),
    },
    Migration {
        version: 2,
        sql: include_str!("migrations/0002_projects_and_activity.sql"),
    },
    Migration {
        version: 3,
        sql: include_str!("migrations/0003_add_task_fields.sql"),
    },
    Migration {
        version: 4,
        sql: include_str!("migrations/0004_add_project_priority.sql"),
    },
    Migration {
        version: 5,
        sql: include_str!("migrations/0005_rename_default_projects.sql"),
    },
    Migration {
        version: 6,
        sql: include_str!("migrations/0006_add_task_project_path.sql"),
    },
    Migration {
        version: 7,
        sql: include_str!("migrations/0007_add_task_planned_end_date.sql"),
    },
    Migration {
        version: 8,
        sql: include_str!("migrations/0008_reset_task_model.sql"),
    },
    Migration {
        version: 9,
        sql: include_str!("migrations/0009_update_project_data_model.sql"),
    },
];

/// 执行所有未执行的迁移。
///
/// - 通过 `schema_migrations(version)` 记录已执行版本
/// - 每个迁移在一个事务内执行，成功后写入版本
pub fn run_migrations(conn: &mut Connection) -> Result<(), AppError> {
    // 兜底：确保迁移表存在
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)",
        (),
    )?;

    let current: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_migrations",
            (),
            |row| row.get(0),
        )
        .unwrap_or(0);

    for m in MIGRATIONS.iter().filter(|m| m.version > current) {
        let needs_no_tx = m.sql.to_ascii_lowercase().contains("pragma foreign_keys = off");

        if needs_no_tx {
            conn.execute_batch(m.sql)?;
            conn.execute(
                "INSERT INTO schema_migrations(version) VALUES (?1)",
                (m.version,),
            )?;
        } else {
            let tx = conn.transaction()?;
            tx.execute_batch(m.sql)?;
            tx.execute(
                "INSERT INTO schema_migrations(version) VALUES (?1)",
                (m.version,),
            )?;
            tx.commit()?;
        }
    }

    Ok(())
}
