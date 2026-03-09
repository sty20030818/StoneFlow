#[derive(Debug, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseUrlArgs {
    pub database_url: String,
}

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

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncCommandReport {
    pub synced_at: i64,
    pub conflict_guard_enabled: bool,
    pub tables: SyncTablesReport,
}
