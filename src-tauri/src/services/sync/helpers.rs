#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(super) enum UpsertDecision {
    Insert,
    Update,
    ConflictSkip,
}

/// 读取冲突保护开关。
///
/// 默认开启，只有显式配置关闭时才允许旧数据覆盖较新的目标端数据。
pub(super) fn is_conflict_guard_enabled() -> bool {
    match std::env::var("STONEFLOW_SYNC_CONFLICT_GUARD") {
        Ok(raw) => {
            let normalized = raw.trim().to_ascii_lowercase();
            !matches!(normalized.as_str(), "0" | "false" | "off" | "no")
        }
        Err(_) => true,
    }
}

/// 根据目标端已有版本和输入记录版本，决定这次写入应该走哪条路径。
pub(super) fn decide_upsert(
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
