use rusqlite::Connection;

use crate::types::{dto::SpaceDto, error::AppError};

pub struct SpaceRepo;

impl SpaceRepo {
    pub fn list(conn: &Connection) -> Result<Vec<SpaceDto>, AppError> {
        let mut stmt = conn.prepare(
            r#"
SELECT id, name, "order", created_at, updated_at
FROM spaces
ORDER BY "order" ASC
"#,
        )?;

        let rows = stmt.query_map((), |row| {
            Ok(SpaceDto {
                id: row.get(0)?,
                name: row.get(1)?,
                order: row.get::<_, i64>(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        })?;

        let mut out = Vec::new();
        for r in rows {
            out.push(r?);
        }
        Ok(out)
    }
}
