//! 同步结果统计与返回结构组装。
//!
//! `upsert/*` 只负责累积各自的统计数字，
//! 最后由这里统一组装成前端需要的 `SyncCommandReport`。

use super::dto::{SyncCommandReport, SyncTableReport, SyncTablesReport};

/// 适用于“插入 / 更新 / 冲突跳过”三种结果都可能出现的表。
#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct UpsertStats {
    pub total: usize,
    pub inserted: usize,
    pub updated: usize,
    pub conflicted: usize,
}

/// 适用于 append-only 或全量去重写入的表。
#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct DedupStats {
    pub total: usize,
    pub inserted: usize,
}

/// 一次 pull 或 push 的完整中间统计结果。
#[derive(Debug, Default)]
pub(crate) struct SyncRunStats {
    pub spaces: UpsertStats,
    pub projects: UpsertStats,
    pub vault_entries: UpsertStats,
    pub tags: DedupStats,
    pub links: UpsertStats,
    pub tasks: UpsertStats,
    pub task_activity_logs: DedupStats,
    pub project_activity_logs: DedupStats,
    pub task_tags: UpsertStats,
    pub task_links: UpsertStats,
    pub project_tags: UpsertStats,
    pub project_links: UpsertStats,
}

impl From<UpsertStats> for SyncTableReport {
    fn from(value: UpsertStats) -> Self {
        SyncTableReport::upsert(value.total, value.inserted, value.updated, value.conflicted)
    }
}

impl From<DedupStats> for SyncTableReport {
    fn from(value: DedupStats) -> Self {
        SyncTableReport::dedup(value.total, value.inserted)
    }
}

impl SyncRunStats {
    /// 在所有表同步完成后，把内部统计转换成对前端稳定暴露的返回结构。
    pub(crate) fn into_command_report(
        self,
        synced_at: i64,
        conflict_guard_enabled: bool,
    ) -> SyncCommandReport {
        SyncCommandReport {
            synced_at,
            conflict_guard_enabled,
            tables: SyncTablesReport {
                spaces: self.spaces.into(),
                projects: self.projects.into(),
                vault_entries: self.vault_entries.into(),
                tags: self.tags.into(),
                links: self.links.into(),
                tasks: self.tasks.into(),
                task_activity_logs: self.task_activity_logs.into(),
                project_activity_logs: self.project_activity_logs.into(),
                task_tags: self.task_tags.into(),
                task_links: self.task_links.into(),
                project_tags: self.project_tags.into(),
                project_links: self.project_links.into(),
            },
        }
    }
}
