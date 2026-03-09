#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UpsertDecision {
    Insert,
    Update,
    ConflictSkip,
}

pub fn is_conflict_guard_enabled() -> bool {
    match std::env::var("STONEFLOW_SYNC_CONFLICT_GUARD") {
        Ok(raw) => {
            let normalized = raw.trim().to_ascii_lowercase();
            !matches!(normalized.as_str(), "0" | "false" | "off" | "no")
        }
        Err(_) => true,
    }
}

pub fn decide_upsert(
    existing_updated_at: Option<i64>,
    incoming_updated_at: i64,
    guard_enabled: bool,
) -> UpsertDecision {
    match existing_updated_at {
        None => UpsertDecision::Insert,
        Some(existing) => {
            if guard_enabled && incoming_updated_at <= existing {
                UpsertDecision::ConflictSkip
            } else {
                UpsertDecision::Update
            }
        }
    }
}
