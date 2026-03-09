use super::dto::{SyncCommandReport, SyncTableReport, SyncTablesReport};

#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct UpsertStats {
    pub total: usize,
    pub inserted: usize,
    pub updated: usize,
    pub conflicted: usize,
}

#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct DedupStats {
    pub total: usize,
    pub inserted: usize,
}

#[derive(Debug, Default)]
pub(crate) struct SyncRunStats {
    pub spaces: UpsertStats,
    pub projects: UpsertStats,
    pub tags: DedupStats,
    pub links: UpsertStats,
    pub tasks: UpsertStats,
    pub task_activity_logs: DedupStats,
    pub task_tags: DedupStats,
    pub task_links: DedupStats,
    pub project_tags: DedupStats,
    pub project_links: DedupStats,
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
                tags: self.tags.into(),
                links: self.links.into(),
                tasks: self.tasks.into(),
                task_activity_logs: self.task_activity_logs.into(),
                task_tags: self.task_tags.into(),
                task_links: self.task_links.into(),
                project_tags: self.project_tags.into(),
                project_links: self.project_links.into(),
            },
        }
    }
}
