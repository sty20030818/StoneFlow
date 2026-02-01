use crate::db::now_ms;
use crate::types::error::AppError;

pub fn seed_default_spaces_if_empty(conn: &mut rusqlite::Connection) -> Result<(), AppError> {
    // 不变量：仅在 spaces 为空时插入，固定 ID 与顺序不可变。
    let count: i64 = conn.query_row("SELECT COUNT(1) FROM spaces", (), |row| row.get(0))?;
    if count > 0 {
        return Ok(());
    }

    let now = now_ms();
    let tx = conn.transaction()?;

    let spaces = [
        ("work", "工作", 1_i64),
        ("study", "学习", 2_i64),
        ("personal", "个人", 3_i64),
    ];

    for (id, name, order) in spaces {
        tx.execute(
            "INSERT INTO spaces(id, name, \"order\", created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5)",
            (id, name, order, now, now),
        )?;
    }

    tx.commit()?;
    Ok(())
}
