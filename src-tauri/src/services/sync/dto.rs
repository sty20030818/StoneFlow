//! Sync service 对外返回与输入模型。

#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseUrlArgs {
    /// 远端数据库连接串，由前端配置页传入。
    pub database_url: String,
}

/// 单张表在一次同步里的统计结果。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncTableReport {
    pub total: usize,
    pub inserted: usize,
    pub updated: usize,
    pub conflicted: usize,
    pub skipped: usize,
}

impl SyncTableReport {
    /// 适用于“插入 / 更新 / 冲突跳过”类型表的统计构造器。
    pub fn upsert(total: usize, inserted: usize, updated: usize, conflicted: usize) -> Self {
        Self {
            total,
            inserted,
            updated,
            conflicted,
            skipped: total
                .saturating_sub(inserted.saturating_add(updated).saturating_add(conflicted)),
        }
    }

    /// 适用于 append-only 或全量去重表的统计构造器。
    pub fn dedup(total: usize, inserted: usize) -> Self {
        Self {
            total,
            inserted,
            updated: 0,
            conflicted: 0,
            skipped: total.saturating_sub(inserted),
        }
    }
}

/// 一次同步里所有表的统计汇总。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncTablesReport {
    pub spaces: SyncTableReport,
    pub projects: SyncTableReport,
    pub tags: SyncTableReport,
    pub links: SyncTableReport,
    pub tasks: SyncTableReport,
    pub task_activity_logs: SyncTableReport,
    pub task_tags: SyncTableReport,
    pub task_links: SyncTableReport,
    pub project_tags: SyncTableReport,
    pub project_links: SyncTableReport,
}

/// pull / push 命令最终返回给前端的完整结果。
#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncCommandReport {
    /// 本轮同步开始时的毫秒时间戳。
    pub synced_at: i64,
    /// 是否启用了“目标端较新数据不被旧数据覆盖”的保护。
    pub conflict_guard_enabled: bool,
    pub tables: SyncTablesReport,
}
