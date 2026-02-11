//! Task 更新逻辑（patch 语义）。
//!
//! 重点：
//! - tri-state 字段用 `Option<Option<T>>` 表达“保持/清空/设置”
//! - 事务内完成主表更新 + 标签/链接同步 + 项目统计刷新
//! - `changed_any` 防止空 patch 误写入

use std::collections::HashSet;

use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, DatabaseConnection, EntityTrait,
    IntoActiveModel, JoinType, QueryFilter, QueryOrder, QuerySelect, RelationTrait, Set,
    TransactionTrait,
};

use crate::db::entities::{
    links as link_entities,
    sea_orm_active_enums::{DoneReason, LinkKind, Priority, TaskStatus},
    tags as tag_entities, task_links, task_tags, tasks,
};
use crate::db::now_ms;

use crate::types::error::AppError;

use super::{activity_logs, custom_fields, links, stats, tags, validations, TaskUpdateInput};

fn priority_to_value(priority: &Priority) -> String {
    match priority {
        Priority::P0 => "P0".to_string(),
        Priority::P1 => "P1".to_string(),
        Priority::P2 => "P2".to_string(),
        Priority::P3 => "P3".to_string(),
    }
}

fn done_reason_to_value(done_reason: &Option<DoneReason>) -> Option<String> {
    done_reason.as_ref().map(|x| match x {
        DoneReason::Completed => "completed".to_string(),
        DoneReason::Cancelled => "cancelled".to_string(),
    })
}

fn normalize_tags_for_log(tags: &[String]) -> Vec<String> {
    let mut normalized = Vec::new();
    for tag in tags {
        let value = tag.trim();
        if value.is_empty() || normalized.iter().any(|item: &String| item == value) {
            continue;
        }
        normalized.push(value.to_string());
    }
    normalized
}

fn link_kind_to_value(kind: &LinkKind) -> &'static str {
    match kind {
        LinkKind::Doc => "doc",
        LinkKind::RepoLocal => "repoLocal",
        LinkKind::RepoRemote => "repoRemote",
        LinkKind::Web => "web",
        LinkKind::Design => "design",
        LinkKind::Other => "other",
    }
}

fn format_link_for_log(kind: &str, title: &str, url: &str) -> String {
    format!("{}:{}<{}>", kind, title.trim(), url.trim())
}

fn to_optional_join(values: Vec<String>, separator: &str) -> Option<String> {
    if values.is_empty() {
        None
    } else {
        Some(values.join(separator))
    }
}

fn normalize_links_for_log(links: &[crate::types::dto::LinkInputDto]) -> Vec<String> {
    links
        .iter()
        .map(|item| format_link_for_log(item.kind.as_str(), item.title.as_str(), item.url.as_str()))
        .collect()
}

async fn load_task_tags_for_log<C>(conn: &C, task_id: &str) -> Result<Vec<String>, AppError>
where
    C: ConnectionTrait,
{
    task_tags::Entity::find()
        .select_only()
        .column(tag_entities::Column::Name)
        .join(JoinType::InnerJoin, task_tags::Relation::Tags.def())
        .filter(task_tags::Column::TaskId.eq(task_id))
        .order_by_asc(tag_entities::Column::Name)
        .order_by_asc(tag_entities::Column::CreatedAt)
        .into_tuple()
        .all(conn)
        .await
        .map_err(AppError::from)
}

async fn load_task_links_for_log<C>(conn: &C, task_id: &str) -> Result<Vec<String>, AppError>
where
    C: ConnectionTrait,
{
    let rows: Vec<(String, String, LinkKind, i64, i64)> = task_links::Entity::find()
        .select_only()
        .column(link_entities::Column::Title)
        .column(link_entities::Column::Url)
        .column(link_entities::Column::Kind)
        .column(link_entities::Column::Rank)
        .column(link_entities::Column::CreatedAt)
        .join(JoinType::InnerJoin, task_links::Relation::Links.def())
        .filter(task_links::Column::TaskId.eq(task_id))
        .order_by_asc(link_entities::Column::Rank)
        .order_by_asc(link_entities::Column::CreatedAt)
        .into_tuple()
        .all(conn)
        .await
        .map_err(AppError::from)?;

    Ok(rows
        .into_iter()
        .map(|(title, url, kind, _rank, _created_at)| {
            format_link_for_log(link_kind_to_value(&kind), &title, &url)
        })
        .collect())
}

pub async fn update(conn: &DatabaseConnection, input: TaskUpdateInput) -> Result<(), AppError> {
    let TaskUpdateInput { id, patch } = input;
    let title = patch.title;
    let status = patch.status;
    let done_reason = patch.done_reason;
    let priority = patch.priority;
    let note = patch.note;
    let tags_input = patch.tags;
    let space_id = patch.space_id;
    let project_id = patch.project_id;
    let deadline_at = patch.deadline_at;
    let rank = patch.rank;
    let links_input = patch.links;
    let custom_fields_input = patch.custom_fields;
    let archived_at = patch.archived_at;
    let deleted_at = patch.deleted_at;
    let tags_input_for_log = tags_input.clone();
    let links_input_for_log = links_input.clone();

    let txn = conn.begin().await.map_err(AppError::from)?;

    // 1) 读取旧值：后续用于比较“是否需要重算 rank/刷新统计”。
    let task_model = tasks::Entity::find_by_id(id.as_str())
        .one(&txn)
        .await
        .map_err(AppError::from)?;

    let task_model = match task_model {
        Some(m) => m,
        None => return Err(AppError::Validation("任务不存在".to_string())),
    };
    let previous_task = task_model.clone();
    let previous_tags_for_log = if tags_input_for_log.is_some() {
        to_optional_join(load_task_tags_for_log(&txn, &id).await?, ",")
    } else {
        None
    };
    let previous_links_for_log = if links_input_for_log.is_some() {
        to_optional_join(load_task_links_for_log(&txn, &id).await?, ", ")
    } else {
        None
    };
    let next_tags_for_log = tags_input_for_log
        .as_ref()
        .map(|items| to_optional_join(normalize_tags_for_log(items), ","))
        .unwrap_or(None);
    let next_links_for_log = links_input_for_log
        .as_ref()
        .map(|items| to_optional_join(normalize_links_for_log(items), ", "))
        .unwrap_or(None);
    let tags_changed = tags_input_for_log.is_some() && previous_tags_for_log != next_tags_for_log;
    let links_changed = links_input_for_log.is_some() && previous_links_for_log != next_links_for_log;

    let previous_project_id = task_model.project_id.clone();
    let current_status_is_done = task_model.status == TaskStatus::Done;
    let previous_status = task_model.status.clone();
    let previous_priority = task_model.priority.clone();
    let previous_space_id = task_model.space_id.clone();
    let mut effective_status = task_model.status.clone();
    let mut effective_priority = task_model.priority.clone();
    let mut effective_space_id = task_model.space_id.clone();
    let mut priority_changed = false;
    let mut status_changed_to_todo = false;
    let mut space_changed = false;
    let mut project_changed = false;
    let mut rank_changed_by_auto_bucket = false;

    let mut active_model = task_model.into_active_model();
    let now = now_ms();
    let mut touch_updated_at = false;
    let mut changed_any = false;

    // 2) 套用 patch：只处理传入字段。
    if let Some(title) = title.as_deref() {
        let title = validations::trim_and_validate_title(title)?;
        active_model.title = Set(title);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(status_str) = status.as_deref() {
        let status_str = validations::normalize_status(status_str)?;
        let is_done = status_str == "done";

        if is_done {
            // 重点：任务切换到 done 时，必须有 done_reason。
            let reason_str =
                validations::require_done_reason(done_reason.as_ref().map(|v| v.as_deref()))?;
            let reason_enum = match reason_str.as_str() {
                "completed" => DoneReason::Completed,
                "cancelled" => DoneReason::Cancelled,
                _ => DoneReason::Completed,
            };
            active_model.status = Set(TaskStatus::Done);
            active_model.done_reason = Set(Some(reason_enum));
            active_model.completed_at = Set(Some(now));
            effective_status = TaskStatus::Done;
        } else {
            active_model.status = Set(TaskStatus::Todo);
            active_model.done_reason = Set(None);
            active_model.completed_at = Set(None);
            effective_status = TaskStatus::Todo;
            if previous_status == TaskStatus::Done {
                status_changed_to_todo = true;
            }
        }
        touch_updated_at = true;
        changed_any = true;
    } else if let Some(reason_opt) = done_reason.as_ref() {
        // 仅当当前已是 done 才允许单独更新 done_reason。
        if !current_status_is_done {
            return Err(AppError::Validation(
                "仅完成任务可设置 doneReason".to_string(),
            ));
        }
        let reason = validations::normalize_done_reason(
            reason_opt
                .as_deref()
                .ok_or_else(|| AppError::Validation("doneReason 不可为空".to_string()))?,
        )?;
        let reason_enum = match reason.as_str() {
            "completed" => DoneReason::Completed,
            "cancelled" => DoneReason::Cancelled,
            _ => DoneReason::Completed,
        };
        active_model.done_reason = Set(Some(reason_enum));
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(priority_str) = priority.as_deref() {
        let priority_str = validations::normalize_priority(priority_str)?;
        let p_enum = match priority_str.as_str() {
            "P0" => Priority::P0,
            "P1" => Priority::P1,
            "P2" => Priority::P2,
            "P3" => Priority::P3,
            _ => Priority::P1,
        };
        active_model.priority = Set(p_enum.clone());
        effective_priority = p_enum;
        priority_changed = effective_priority != previous_priority;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(note_opt) = note {
        active_model.note = Set(note_opt
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty()));
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(space_id) = space_id.as_deref() {
        active_model.space_id = Set(space_id.to_string());
        effective_space_id = space_id.to_string();
        space_changed = effective_space_id != previous_space_id;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(project_id_opt) = project_id.as_ref() {
        let next_project_id = project_id_opt.clone();
        active_model.project_id = Set(next_project_id.clone());
        project_changed = next_project_id != previous_project_id;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(deadline_opt) = deadline_at {
        active_model.deadline_at = Set(deadline_opt);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(rank) = rank {
        active_model.rank = Set(rank);
        touch_updated_at = true;
        changed_any = true;
    } else if effective_status == TaskStatus::Todo
        && (priority_changed || status_changed_to_todo || space_changed || project_changed)
    {
        // 重点：分桶字段变化（优先级/空间/项目/状态）后，rank 应落到新桶尾部。
        let max_rank_task = tasks::Entity::find()
            .filter(tasks::Column::SpaceId.eq(effective_space_id.clone()))
            .filter(tasks::Column::Status.eq(TaskStatus::Todo))
            .filter(tasks::Column::Priority.eq(effective_priority.clone()))
            .filter(tasks::Column::DeletedAt.is_null())
            .order_by_desc(tasks::Column::Rank)
            .one(&txn)
            .await
            .map_err(AppError::from)?;

        let new_rank = max_rank_task.map(|t| t.rank + 1024).unwrap_or(1024);
        active_model.rank = Set(new_rank);
        rank_changed_by_auto_bucket = true;
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(archived_opt) = archived_at {
        active_model.archived_at = Set(archived_opt);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(deleted_opt) = deleted_at {
        active_model.deleted_at = Set(deleted_opt);
        touch_updated_at = true;
        changed_any = true;
    }

    if let Some(custom_fields_opt) = custom_fields_input {
        match custom_fields_opt {
            Some(value) => {
                let normalized = custom_fields::normalize_custom_fields(value)?;
                let payload = custom_fields::serialize_custom_fields(&normalized)?;
                active_model.custom_fields = Set(Some(payload));
            }
            None => {
                active_model.custom_fields = Set(None);
            }
        }
        touch_updated_at = true;
        changed_any = true;
    }

    // 统一更新 updated_at，避免每个分支重复写。
    if touch_updated_at {
        active_model.updated_at = Set(now);
    }

    // 3) 保存主模型。

    let saved_model = active_model.update(&txn).await.map_err(AppError::from)?;
    let new_project_id = saved_model.project_id.clone();

    // 4) 处理关联表（links/tags）。
    if links_changed {
        if let Some(links_input) = links_input.as_ref() {
            links::sync_links(&txn, &id, links_input).await?;
            changed_any = true;
        }
    }

    if tags_changed {
        if let Some(tags_input) = tags_input.as_ref() {
            tags::sync_tags(&txn, &id, tags_input).await?;
            changed_any = true;
        }
    }

    if !changed_any {
        return Err(AppError::Validation("没有可更新的字段".to_string()));
    }

    let log_ctx = activity_logs::TaskLogCtx {
        task_id: &saved_model.id,
        space_id: &saved_model.space_id,
        project_id: saved_model.project_id.as_deref(),
        create_by: &saved_model.create_by,
        created_at: now,
    };

    if previous_task.status != TaskStatus::Done && saved_model.status == TaskStatus::Done {
        activity_logs::append_completed(&txn, log_ctx.clone(), &saved_model.title).await?;
    }

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "title",
        "标题",
        Some(previous_task.title.clone()),
        Some(saved_model.title.clone()),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "priority",
        "优先级",
        Some(priority_to_value(&previous_task.priority)),
        Some(priority_to_value(&saved_model.priority)),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "note",
        "备注",
        previous_task.note.clone(),
        saved_model.note.clone(),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "spaceId",
        "所属 Space",
        Some(previous_task.space_id.clone()),
        Some(saved_model.space_id.clone()),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "projectId",
        "所属 Project",
        previous_task.project_id.clone(),
        saved_model.project_id.clone(),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "deadlineAt",
        "截止时间",
        previous_task.deadline_at.map(|x| x.to_string()),
        saved_model.deadline_at.map(|x| x.to_string()),
    )
    .await?;

    if !rank_changed_by_auto_bucket {
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "rank",
            "排序权重",
            Some(previous_task.rank.to_string()),
            Some(saved_model.rank.to_string()),
        )
        .await?;
    }

    if previous_task.status == TaskStatus::Done && saved_model.status == TaskStatus::Done {
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "doneReason",
            "完成原因",
            done_reason_to_value(&previous_task.done_reason),
            done_reason_to_value(&saved_model.done_reason),
        )
        .await?;
    }

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "archivedAt",
        "归档时间",
        previous_task.archived_at.map(|x| x.to_string()),
        saved_model.archived_at.map(|x| x.to_string()),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "deletedAt",
        "删除时间",
        previous_task.deleted_at.map(|x| x.to_string()),
        saved_model.deleted_at.map(|x| x.to_string()),
    )
    .await?;

    activity_logs::append_field_updated(
        &txn,
        log_ctx.clone(),
        "customFields",
        "自定义字段",
        previous_task.custom_fields.clone(),
        saved_model.custom_fields.clone(),
    )
    .await?;

    if tags_changed {
        activity_logs::append_field_updated(
            &txn,
            log_ctx.clone(),
            "tags",
            "标签",
            previous_tags_for_log.clone(),
            next_tags_for_log.clone(),
        )
        .await?;
    }

    if links_changed {
        activity_logs::append_field_updated(
            &txn,
            log_ctx,
            "links",
            "关联链接",
            previous_links_for_log,
            next_links_for_log,
        )
        .await?;
    }

    // 5) 刷新可能受影响的项目统计（旧项目 + 新项目）。
    let mut touched_pids = HashSet::new();
    if let Some(pid) = previous_project_id {
        touched_pids.insert(pid);
    }
    if let Some(pid) = new_project_id {
        touched_pids.insert(pid);
    }

    for pid in touched_pids {
        stats::refresh_project_stats(&txn, &pid, now).await?;
    }

    txn.commit().await.map_err(AppError::from)?;
    Ok(())
}
