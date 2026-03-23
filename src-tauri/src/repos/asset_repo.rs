use sea_orm::{
    ActiveModelTrait, ColumnTrait, ConnectionTrait, EntityTrait, QueryFilter, QueryOrder, Set,
    sea_query::OnConflict,
};
use serde::de::DeserializeOwned;

use crate::db::entities::{
    app_settings, asset_diary_entries, asset_notes, asset_snippets, asset_vault_entries,
};
use crate::types::{
    dto::{
        AssetDiaryEntryDto, AssetNoteDto, AssetSnippetDto, AssetVaultEntryDto,
        AssetsMigrationStatusDto,
    },
    error::AppError,
};

const ASSETS_MIGRATION_STATE_KEY: &str = "assets_library_v2_migrated_at";

pub struct AssetRepo;

pub struct NewSnippetRecord {
    pub id: String,
    pub title: String,
    pub language: String,
    pub content: String,
    pub description: Option<String>,
    pub folder: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub linked_task_id: Option<String>,
    pub linked_project_id: Option<String>,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct NewNoteRecord {
    pub id: String,
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub linked_project_id: Option<String>,
    pub linked_task_id: Option<String>,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct NewDiaryEntryRecord {
    pub id: String,
    pub date: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub content: String,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub linked_task_ids: Vec<String>,
    pub linked_project_id: Option<String>,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct NewVaultEntryRecord {
    pub id: String,
    pub name: String,
    pub secret_type: String,
    pub environment: Option<String>,
    pub value: String,
    pub folder: Option<String>,
    pub note: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub sync_state: String,
    pub created_at: i64,
    pub updated_at: i64,
}

fn serialize_json<T>(value: &T) -> Result<String, AppError>
where
    T: serde::Serialize,
{
    serde_json::to_string(value)
        .map_err(|error| AppError::Internal(format!("序列化资产字段失败：{error}")))
}

fn deserialize_json<T>(raw: &str) -> Result<T, AppError>
where
    T: DeserializeOwned,
{
    serde_json::from_str(raw)
        .map_err(|error| AppError::Internal(format!("反序列化资产字段失败：{error}")))
}

fn map_snippet_model(model: asset_snippets::Model) -> Result<AssetSnippetDto, AppError> {
    Ok(AssetSnippetDto {
        id: model.id,
        title: model.title,
        language: model.language,
        content: model.content,
        description: model.description,
        folder: model.folder,
        tags: deserialize_json(&model.tags)?,
        favorite: model.favorite,
        linked_task_id: model.linked_task_id,
        linked_project_id: model.linked_project_id,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

fn map_note_model(model: asset_notes::Model) -> Result<AssetNoteDto, AppError> {
    Ok(AssetNoteDto {
        id: model.id,
        title: model.title,
        content: model.content,
        excerpt: model.excerpt,
        tags: deserialize_json(&model.tags)?,
        favorite: model.favorite,
        linked_project_id: model.linked_project_id,
        linked_task_id: model.linked_task_id,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

fn map_diary_entry_model(model: asset_diary_entries::Model) -> Result<AssetDiaryEntryDto, AppError> {
    Ok(AssetDiaryEntryDto {
        id: model.id,
        date: model.date,
        title: model.title,
        subtitle: model.subtitle,
        content: model.content,
        tags: deserialize_json(&model.tags)?,
        favorite: model.favorite,
        linked_task_ids: deserialize_json(&model.linked_task_ids)?,
        linked_project_id: model.linked_project_id,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

fn map_vault_entry_model(model: asset_vault_entries::Model) -> Result<AssetVaultEntryDto, AppError> {
    Ok(AssetVaultEntryDto {
        id: model.id,
        name: model.name,
        r#type: model.secret_type,
        environment: model.environment,
        value: model.value,
        folder: model.folder,
        note: model.note,
        tags: deserialize_json(&model.tags)?,
        favorite: model.favorite,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

impl AssetRepo {
    pub async fn list_snippets<C>(conn: &C) -> Result<Vec<AssetSnippetDto>, AppError>
    where
        C: ConnectionTrait,
    {
        asset_snippets::Entity::find()
            .order_by_desc(asset_snippets::Column::UpdatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?
            .into_iter()
            .map(map_snippet_model)
            .collect()
    }

    pub async fn list_notes<C>(conn: &C) -> Result<Vec<AssetNoteDto>, AppError>
    where
        C: ConnectionTrait,
    {
        asset_notes::Entity::find()
            .order_by_desc(asset_notes::Column::UpdatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?
            .into_iter()
            .map(map_note_model)
            .collect()
    }

    pub async fn list_diary_entries<C>(conn: &C) -> Result<Vec<AssetDiaryEntryDto>, AppError>
    where
        C: ConnectionTrait,
    {
        asset_diary_entries::Entity::find()
            .order_by_desc(asset_diary_entries::Column::Date)
            .order_by_desc(asset_diary_entries::Column::UpdatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?
            .into_iter()
            .map(map_diary_entry_model)
            .collect()
    }

    pub async fn list_vault_entries<C>(conn: &C) -> Result<Vec<AssetVaultEntryDto>, AppError>
    where
        C: ConnectionTrait,
    {
        asset_vault_entries::Entity::find()
            .order_by_desc(asset_vault_entries::Column::UpdatedAt)
            .all(conn)
            .await
            .map_err(AppError::from)?
            .into_iter()
            .map(map_vault_entry_model)
            .collect()
    }

    pub async fn get_snippet_by_id<C>(conn: &C, id: &str) -> Result<asset_snippets::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_snippets::Entity::find_by_id(id.to_string())
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation("代码片段不存在".to_string()))
    }

    pub async fn get_note_by_id<C>(conn: &C, id: &str) -> Result<asset_notes::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_notes::Entity::find_by_id(id.to_string())
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation("笔记不存在".to_string()))
    }

    pub async fn get_diary_entry_by_id<C>(
        conn: &C,
        id: &str,
    ) -> Result<asset_diary_entries::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_diary_entries::Entity::find_by_id(id.to_string())
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation("日记不存在".to_string()))
    }

    pub async fn get_vault_entry_by_id<C>(
        conn: &C,
        id: &str,
    ) -> Result<asset_vault_entries::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_vault_entries::Entity::find_by_id(id.to_string())
            .one(conn)
            .await
            .map_err(AppError::from)?
            .ok_or_else(|| AppError::Validation("密钥条目不存在".to_string()))
    }

    pub async fn insert_snippet<C>(
        conn: &C,
        record: NewSnippetRecord,
    ) -> Result<asset_snippets::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_snippets::ActiveModel {
            id: Set(record.id),
            title: Set(record.title),
            language: Set(record.language),
            content: Set(record.content),
            description: Set(record.description),
            folder: Set(record.folder),
            tags: Set(serialize_json(&record.tags)?),
            favorite: Set(record.favorite),
            linked_task_id: Set(record.linked_task_id),
            linked_project_id: Set(record.linked_project_id),
            sync_state: Set(record.sync_state),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(conn)
        .await
        .map_err(AppError::from)
    }

    pub async fn insert_note<C>(conn: &C, record: NewNoteRecord) -> Result<asset_notes::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_notes::ActiveModel {
            id: Set(record.id),
            title: Set(record.title),
            content: Set(record.content),
            excerpt: Set(record.excerpt),
            tags: Set(serialize_json(&record.tags)?),
            favorite: Set(record.favorite),
            linked_project_id: Set(record.linked_project_id),
            linked_task_id: Set(record.linked_task_id),
            sync_state: Set(record.sync_state),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(conn)
        .await
        .map_err(AppError::from)
    }

    pub async fn insert_diary_entry<C>(
        conn: &C,
        record: NewDiaryEntryRecord,
    ) -> Result<asset_diary_entries::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_diary_entries::ActiveModel {
            id: Set(record.id),
            date: Set(record.date),
            title: Set(record.title),
            subtitle: Set(record.subtitle),
            content: Set(record.content),
            tags: Set(serialize_json(&record.tags)?),
            favorite: Set(record.favorite),
            linked_task_ids: Set(serialize_json(&record.linked_task_ids)?),
            linked_project_id: Set(record.linked_project_id),
            sync_state: Set(record.sync_state),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(conn)
        .await
        .map_err(AppError::from)
    }

    pub async fn insert_vault_entry<C>(
        conn: &C,
        record: NewVaultEntryRecord,
    ) -> Result<asset_vault_entries::Model, AppError>
    where
        C: ConnectionTrait,
    {
        asset_vault_entries::ActiveModel {
            id: Set(record.id),
            name: Set(record.name),
            secret_type: Set(record.secret_type),
            environment: Set(record.environment),
            value: Set(record.value),
            folder: Set(record.folder),
            note: Set(record.note),
            tags: Set(serialize_json(&record.tags)?),
            favorite: Set(record.favorite),
            sync_state: Set(record.sync_state),
            created_at: Set(record.created_at),
            updated_at: Set(record.updated_at),
        }
        .insert(conn)
        .await
        .map_err(AppError::from)
    }

    pub async fn update_snippet<C>(
        conn: &C,
        active_model: asset_snippets::ActiveModel,
    ) -> Result<asset_snippets::Model, AppError>
    where
        C: ConnectionTrait,
    {
        active_model.update(conn).await.map_err(AppError::from)
    }

    pub async fn update_note<C>(
        conn: &C,
        active_model: asset_notes::ActiveModel,
    ) -> Result<asset_notes::Model, AppError>
    where
        C: ConnectionTrait,
    {
        active_model.update(conn).await.map_err(AppError::from)
    }

    pub async fn update_diary_entry<C>(
        conn: &C,
        active_model: asset_diary_entries::ActiveModel,
    ) -> Result<asset_diary_entries::Model, AppError>
    where
        C: ConnectionTrait,
    {
        active_model.update(conn).await.map_err(AppError::from)
    }

    pub async fn update_vault_entry<C>(
        conn: &C,
        active_model: asset_vault_entries::ActiveModel,
    ) -> Result<asset_vault_entries::Model, AppError>
    where
        C: ConnectionTrait,
    {
        active_model.update(conn).await.map_err(AppError::from)
    }

    pub async fn delete_snippet<C>(conn: &C, id: &str) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_snippets::Entity::delete_by_id(id.to_string())
            .exec(conn)
            .await
            .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn delete_note<C>(conn: &C, id: &str) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_notes::Entity::delete_by_id(id.to_string())
            .exec(conn)
            .await
            .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn delete_diary_entry<C>(conn: &C, id: &str) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_diary_entries::Entity::delete_by_id(id.to_string())
            .exec(conn)
            .await
            .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn delete_vault_entry<C>(conn: &C, id: &str) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_vault_entries::Entity::delete_by_id(id.to_string())
            .exec(conn)
            .await
            .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn upsert_imported_snippet<C>(
        conn: &C,
        dto: &AssetSnippetDto,
    ) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        app_settings::Entity::find_by_id(ASSETS_MIGRATION_STATE_KEY.to_string())
            .filter(app_settings::Column::Key.eq(ASSETS_MIGRATION_STATE_KEY))
            .all(conn)
            .await
            .map_err(AppError::from)?;
        asset_snippets::Entity::insert(asset_snippets::ActiveModel {
            id: Set(dto.id.clone()),
            title: Set(dto.title.clone()),
            language: Set(dto.language.clone()),
            content: Set(dto.content.clone()),
            description: Set(dto.description.clone()),
            folder: Set(dto.folder.clone()),
            tags: Set(serialize_json(&dto.tags)?),
            favorite: Set(dto.favorite),
            linked_task_id: Set(dto.linked_task_id.clone()),
            linked_project_id: Set(dto.linked_project_id.clone()),
            sync_state: Set(dto.sync_state.clone()),
            created_at: Set(dto.created_at),
            updated_at: Set(dto.updated_at),
        })
        .on_conflict(
            OnConflict::column(asset_snippets::Column::Id)
                .update_columns([
                    asset_snippets::Column::Title,
                    asset_snippets::Column::Language,
                    asset_snippets::Column::Content,
                    asset_snippets::Column::Description,
                    asset_snippets::Column::Folder,
                    asset_snippets::Column::Tags,
                    asset_snippets::Column::Favorite,
                    asset_snippets::Column::LinkedTaskId,
                    asset_snippets::Column::LinkedProjectId,
                    asset_snippets::Column::SyncState,
                    asset_snippets::Column::UpdatedAt,
                ])
                .to_owned(),
        )
        .exec(conn)
        .await
        .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn upsert_imported_note<C>(conn: &C, dto: &AssetNoteDto) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_notes::Entity::insert(asset_notes::ActiveModel {
            id: Set(dto.id.clone()),
            title: Set(dto.title.clone()),
            content: Set(dto.content.clone()),
            excerpt: Set(dto.excerpt.clone()),
            tags: Set(serialize_json(&dto.tags)?),
            favorite: Set(dto.favorite),
            linked_project_id: Set(dto.linked_project_id.clone()),
            linked_task_id: Set(dto.linked_task_id.clone()),
            sync_state: Set(dto.sync_state.clone()),
            created_at: Set(dto.created_at),
            updated_at: Set(dto.updated_at),
        })
        .on_conflict(
            OnConflict::column(asset_notes::Column::Id)
                .update_columns([
                    asset_notes::Column::Title,
                    asset_notes::Column::Content,
                    asset_notes::Column::Excerpt,
                    asset_notes::Column::Tags,
                    asset_notes::Column::Favorite,
                    asset_notes::Column::LinkedProjectId,
                    asset_notes::Column::LinkedTaskId,
                    asset_notes::Column::SyncState,
                    asset_notes::Column::UpdatedAt,
                ])
                .to_owned(),
        )
        .exec(conn)
        .await
        .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn upsert_imported_diary_entry<C>(
        conn: &C,
        dto: &AssetDiaryEntryDto,
    ) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_diary_entries::Entity::insert(asset_diary_entries::ActiveModel {
            id: Set(dto.id.clone()),
            date: Set(dto.date.clone()),
            title: Set(dto.title.clone()),
            subtitle: Set(dto.subtitle.clone()),
            content: Set(dto.content.clone()),
            tags: Set(serialize_json(&dto.tags)?),
            favorite: Set(dto.favorite),
            linked_task_ids: Set(serialize_json(&dto.linked_task_ids)?),
            linked_project_id: Set(dto.linked_project_id.clone()),
            sync_state: Set(dto.sync_state.clone()),
            created_at: Set(dto.created_at),
            updated_at: Set(dto.updated_at),
        })
        .on_conflict(
            OnConflict::column(asset_diary_entries::Column::Id)
                .update_columns([
                    asset_diary_entries::Column::Date,
                    asset_diary_entries::Column::Title,
                    asset_diary_entries::Column::Subtitle,
                    asset_diary_entries::Column::Content,
                    asset_diary_entries::Column::Tags,
                    asset_diary_entries::Column::Favorite,
                    asset_diary_entries::Column::LinkedTaskIds,
                    asset_diary_entries::Column::LinkedProjectId,
                    asset_diary_entries::Column::SyncState,
                    asset_diary_entries::Column::UpdatedAt,
                ])
                .to_owned(),
        )
        .exec(conn)
        .await
        .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn upsert_imported_vault_entry<C>(
        conn: &C,
        dto: &AssetVaultEntryDto,
    ) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        asset_vault_entries::Entity::insert(asset_vault_entries::ActiveModel {
            id: Set(dto.id.clone()),
            name: Set(dto.name.clone()),
            secret_type: Set(dto.r#type.clone()),
            environment: Set(dto.environment.clone()),
            value: Set(dto.value.clone()),
            folder: Set(dto.folder.clone()),
            note: Set(dto.note.clone()),
            tags: Set(serialize_json(&dto.tags)?),
            favorite: Set(dto.favorite),
            sync_state: Set(dto.sync_state.clone()),
            created_at: Set(dto.created_at),
            updated_at: Set(dto.updated_at),
        })
        .on_conflict(
            OnConflict::column(asset_vault_entries::Column::Id)
                .update_columns([
                    asset_vault_entries::Column::Name,
                    asset_vault_entries::Column::SecretType,
                    asset_vault_entries::Column::Environment,
                    asset_vault_entries::Column::Value,
                    asset_vault_entries::Column::Folder,
                    asset_vault_entries::Column::Note,
                    asset_vault_entries::Column::Tags,
                    asset_vault_entries::Column::Favorite,
                    asset_vault_entries::Column::SyncState,
                    asset_vault_entries::Column::UpdatedAt,
                ])
                .to_owned(),
        )
        .exec(conn)
        .await
        .map_err(AppError::from)?;
        Ok(())
    }

    pub async fn read_migration_status<C>(conn: &C) -> Result<AssetsMigrationStatusDto, AppError>
    where
        C: ConnectionTrait,
    {
        let setting = app_settings::Entity::find_by_id(ASSETS_MIGRATION_STATE_KEY.to_string())
            .one(conn)
            .await
            .map_err(AppError::from)?;

        let migrated_at = setting
            .map(|item| {
                item.value.parse::<i64>().map_err(|error| {
                    AppError::Internal(format!("解析资产迁移时间失败：{error}"))
                })
            })
            .transpose()?;

        Ok(AssetsMigrationStatusDto {
            done: migrated_at.is_some(),
            migrated_at,
        })
    }

    pub async fn write_migration_status<C>(conn: &C, migrated_at: i64) -> Result<(), AppError>
    where
        C: ConnectionTrait,
    {
        app_settings::Entity::insert(app_settings::ActiveModel {
            key: Set(ASSETS_MIGRATION_STATE_KEY.to_string()),
            value: Set(migrated_at.to_string()),
        })
        .on_conflict(
            OnConflict::column(app_settings::Column::Key)
                .update_columns([app_settings::Column::Value])
                .to_owned(),
        )
        .exec(conn)
        .await
        .map_err(AppError::from)?;

        Ok(())
    }
}
