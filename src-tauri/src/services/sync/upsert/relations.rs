use sea_orm::{sea_query::OnConflict, DatabaseConnection, EntityTrait};

use crate::db::entities::{
    prelude::{ProjectLinks, ProjectTags, TaskLinks, TaskTags},
    project_links, project_tags, task_links, task_tags,
};
use crate::services::sync::report::DedupStats;

use super::{RelationSyncStats, SyncDirection};

pub(super) async fn sync(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<RelationSyncStats, String> {
    Ok(RelationSyncStats {
        task_tags: sync_task_tags(source_db, target_db, direction).await?,
        task_links: sync_task_links(source_db, target_db, direction).await?,
        project_tags: sync_project_tags(source_db, target_db, direction).await?,
        project_links: sync_project_links(source_db, target_db, direction).await?,
    })
}

async fn sync_task_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, String> {
    let source_items = TaskTags::find()
        .all(source_db)
        .await
        .map_err(|error| format!("{}: {}", direction.read_source_error("TaskTags"), error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: task_tags::ActiveModel = item.into();
        let inserted = task_tags::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([task_tags::Column::TaskId, task_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| format!("{}: {}", direction.write_target_error("TaskTag"), error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

async fn sync_task_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, String> {
    let source_items = TaskLinks::find()
        .all(source_db)
        .await
        .map_err(|error| format!("{}: {}", direction.read_source_error("TaskLinks"), error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: task_links::ActiveModel = item.into();
        let inserted = task_links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([task_links::Column::TaskId, task_links::Column::LinkId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| format!("{}: {}", direction.write_target_error("TaskLink"), error))?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

async fn sync_project_tags(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, String> {
    let source_items = ProjectTags::find()
        .all(source_db)
        .await
        .map_err(|error| format!("{}: {}", direction.read_source_error("ProjectTags"), error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: project_tags::ActiveModel = item.into();
        let inserted = project_tags::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([project_tags::Column::ProjectId, project_tags::Column::TagId])
                    .do_nothing()
                    .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| {
                format!("{}: {}", direction.write_target_error("ProjectTag"), error)
            })?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}

async fn sync_project_links(
    source_db: &DatabaseConnection,
    target_db: &DatabaseConnection,
    direction: SyncDirection,
) -> Result<DedupStats, String> {
    let source_items = ProjectLinks::find()
        .all(source_db)
        .await
        .map_err(|error| format!("{}: {}", direction.read_source_error("ProjectLinks"), error))?;

    let mut stats = DedupStats {
        total: source_items.len(),
        ..Default::default()
    };
    for item in source_items {
        let active_model: project_links::ActiveModel = item.into();
        let inserted = project_links::Entity::insert(active_model)
            .on_conflict(
                OnConflict::columns([
                    project_links::Column::ProjectId,
                    project_links::Column::LinkId,
                ])
                .do_nothing()
                .to_owned(),
            )
            .exec_without_returning(target_db)
            .await
            .map_err(|error| {
                format!("{}: {}", direction.write_target_error("ProjectLink"), error)
            })?;
        stats.inserted += inserted as usize;
    }

    Ok(stats)
}
