use sea_orm::{DatabaseConnection, Set, TransactionTrait};
use uuid::Uuid;

use crate::{
    db::now_ms,
    repos::asset_repo::{
        AssetRepo, NewDiaryEntryRecord, NewNoteRecord, NewSnippetRecord, NewVaultEntryRecord,
    },
    types::{
        dto::{
            AssetDiaryEntryDto, AssetNoteDto, AssetSnippetDto, AssetVaultEntryDto,
            AssetsMigrationStatusDto,
        },
        error::AppError,
    },
};

const DEFAULT_SYNC_STATE: &str = "local";

pub struct AssetService;

pub struct AssetSnippetCreateInput {
    pub title: String,
    pub language: String,
    pub content: String,
    pub description: Option<String>,
    pub folder: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub linked_task_id: Option<String>,
    pub linked_project_id: Option<String>,
}

pub struct AssetSnippetUpdatePatch {
    pub title: Option<String>,
    pub language: Option<String>,
    pub content: Option<String>,
    pub description: Option<Option<String>>,
    pub folder: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_task_id: Option<Option<String>>,
    pub linked_project_id: Option<Option<String>>,
    pub sync_state: Option<String>,
}

pub struct AssetNoteCreateInput {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub linked_project_id: Option<String>,
    pub linked_task_id: Option<String>,
}

pub struct AssetNoteUpdatePatch {
    pub title: Option<String>,
    pub content: Option<String>,
    pub excerpt: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_project_id: Option<Option<String>>,
    pub linked_task_id: Option<Option<String>>,
    pub sync_state: Option<String>,
}

pub struct AssetDiaryEntryCreateInput {
    pub date: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub content: String,
    pub tags: Vec<String>,
    pub favorite: bool,
    pub linked_task_ids: Vec<String>,
    pub linked_project_id: Option<String>,
}

pub struct AssetDiaryEntryUpdatePatch {
    pub date: Option<String>,
    pub title: Option<String>,
    pub subtitle: Option<Option<String>>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_task_ids: Option<Vec<String>>,
    pub linked_project_id: Option<Option<String>>,
    pub sync_state: Option<String>,
}

pub struct AssetVaultEntryCreateInput {
    pub name: String,
    pub secret_type: String,
    pub environment: Option<String>,
    pub value: String,
    pub folder: Option<String>,
    pub note: Option<String>,
    pub tags: Vec<String>,
    pub favorite: bool,
}

pub struct AssetVaultEntryUpdatePatch {
    pub name: Option<String>,
    pub secret_type: Option<String>,
    pub environment: Option<Option<String>>,
    pub value: Option<String>,
    pub folder: Option<Option<String>>,
    pub note: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub sync_state: Option<String>,
}

pub struct LegacyAssetsBundle {
    pub snippets: Vec<AssetSnippetDto>,
    pub notes: Vec<AssetNoteDto>,
    pub diary_entries: Vec<AssetDiaryEntryDto>,
    pub vault_entries: Vec<AssetVaultEntryDto>,
}

fn normalize_required(value: &str, label: &str) -> Result<String, AppError> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err(AppError::Validation(format!("{label}不能为空")));
    }
    Ok(trimmed.to_string())
}

fn normalize_optional(value: Option<String>) -> Option<String> {
    value.and_then(|item| {
        let trimmed = item.trim().to_string();
        if trimmed.is_empty() { None } else { Some(trimmed) }
    })
}

fn normalize_tags(tags: Vec<String>) -> Vec<String> {
    let mut result = Vec::new();
    for tag in tags {
        let trimmed = tag.trim();
        if trimmed.is_empty() {
            continue;
        }
        if !result.iter().any(|item| item == trimmed) {
            result.push(trimmed.to_string());
        }
    }
    result
}

fn normalize_language(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        "plaintext".to_string()
    } else {
        trimmed.to_string()
    }
}

fn normalize_sync_state(value: Option<String>) -> String {
    let trimmed = value.unwrap_or_else(|| DEFAULT_SYNC_STATE.to_string());
    let normalized = trimmed.trim();
    if normalized.is_empty() {
        DEFAULT_SYNC_STATE.to_string()
    } else {
        normalized.to_string()
    }
}

impl AssetService {
    pub async fn create_snippet(
        conn: &DatabaseConnection,
        input: AssetSnippetCreateInput,
    ) -> Result<AssetSnippetDto, AppError> {
        let now = now_ms();
        let model = AssetRepo::insert_snippet(
            conn,
            NewSnippetRecord {
                id: Uuid::new_v4().to_string(),
                title: normalize_required(&input.title, "代码片段标题")?,
                language: normalize_language(&input.language),
                content: input.content,
                description: normalize_optional(input.description),
                folder: normalize_optional(input.folder),
                tags: normalize_tags(input.tags),
                favorite: input.favorite,
                linked_task_id: normalize_optional(input.linked_task_id),
                linked_project_id: normalize_optional(input.linked_project_id),
                sync_state: DEFAULT_SYNC_STATE.to_string(),
                created_at: now,
                updated_at: now,
            },
        )
        .await?;
        asset_repo_to_snippet_dto(model)
    }

    pub async fn update_snippet(
        conn: &DatabaseConnection,
        id: &str,
        patch: AssetSnippetUpdatePatch,
    ) -> Result<(), AppError> {
        let now = now_ms();
        let model = AssetRepo::get_snippet_by_id(conn, id).await?;
        let mut active_model: crate::db::entities::asset_snippets::ActiveModel = model.into();
        if let Some(title) = patch.title {
            active_model.title = Set(normalize_required(&title, "代码片段标题")?);
        }
        if let Some(language) = patch.language {
            active_model.language = Set(normalize_language(&language));
        }
        if let Some(content) = patch.content {
            active_model.content = Set(content);
        }
        if let Some(description) = patch.description {
            active_model.description = Set(normalize_optional(description));
        }
        if let Some(folder) = patch.folder {
            active_model.folder = Set(normalize_optional(folder));
        }
        if let Some(tags) = patch.tags {
            active_model.tags = Set(serde_json::to_string(&normalize_tags(tags))
                .map_err(|error| AppError::Internal(format!("序列化代码片段标签失败：{error}")))?);
        }
        if let Some(favorite) = patch.favorite {
            active_model.favorite = Set(favorite);
        }
        if let Some(linked_task_id) = patch.linked_task_id {
            active_model.linked_task_id = Set(normalize_optional(linked_task_id));
        }
        if let Some(linked_project_id) = patch.linked_project_id {
            active_model.linked_project_id = Set(normalize_optional(linked_project_id));
        }
        if let Some(sync_state) = patch.sync_state {
            active_model.sync_state = Set(normalize_sync_state(Some(sync_state)));
        }
        active_model.updated_at = Set(now);
        AssetRepo::update_snippet(conn, active_model).await?;
        Ok(())
    }

    pub async fn delete_snippet(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        AssetRepo::delete_snippet(conn, id).await
    }

    pub async fn create_note(
        conn: &DatabaseConnection,
        input: AssetNoteCreateInput,
    ) -> Result<AssetNoteDto, AppError> {
        let now = now_ms();
        let excerpt = input.content.lines().find(|line| !line.trim().is_empty()).map(|line| {
            line.trim().chars().take(120).collect::<String>()
        });
        let model = AssetRepo::insert_note(
            conn,
            NewNoteRecord {
                id: Uuid::new_v4().to_string(),
                title: normalize_required(&input.title, "笔记标题")?,
                content: input.content,
                excerpt: normalize_optional(input.excerpt).or(excerpt),
                tags: normalize_tags(input.tags),
                favorite: input.favorite,
                linked_project_id: normalize_optional(input.linked_project_id),
                linked_task_id: normalize_optional(input.linked_task_id),
                sync_state: DEFAULT_SYNC_STATE.to_string(),
                created_at: now,
                updated_at: now,
            },
        )
        .await?;
        asset_repo_to_note_dto(model)
    }

    pub async fn update_note(
        conn: &DatabaseConnection,
        id: &str,
        patch: AssetNoteUpdatePatch,
    ) -> Result<(), AppError> {
        let now = now_ms();
        let model = AssetRepo::get_note_by_id(conn, id).await?;
        let mut active_model: crate::db::entities::asset_notes::ActiveModel = model.into();
        if let Some(title) = patch.title {
            active_model.title = Set(normalize_required(&title, "笔记标题")?);
        }
        if let Some(content) = patch.content {
            let excerpt = content
                .lines()
                .find(|line| !line.trim().is_empty())
                .map(|line| line.trim().chars().take(120).collect::<String>());
            active_model.content = Set(content);
            if patch.excerpt.is_none() {
                active_model.excerpt = Set(excerpt);
            }
        }
        if let Some(excerpt) = patch.excerpt {
            active_model.excerpt = Set(normalize_optional(excerpt));
        }
        if let Some(tags) = patch.tags {
            active_model.tags = Set(serde_json::to_string(&normalize_tags(tags))
                .map_err(|error| AppError::Internal(format!("序列化笔记标签失败：{error}")))?);
        }
        if let Some(favorite) = patch.favorite {
            active_model.favorite = Set(favorite);
        }
        if let Some(linked_project_id) = patch.linked_project_id {
            active_model.linked_project_id = Set(normalize_optional(linked_project_id));
        }
        if let Some(linked_task_id) = patch.linked_task_id {
            active_model.linked_task_id = Set(normalize_optional(linked_task_id));
        }
        if let Some(sync_state) = patch.sync_state {
            active_model.sync_state = Set(normalize_sync_state(Some(sync_state)));
        }
        active_model.updated_at = Set(now);
        AssetRepo::update_note(conn, active_model).await?;
        Ok(())
    }

    pub async fn delete_note(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        AssetRepo::delete_note(conn, id).await
    }

    pub async fn create_diary_entry(
        conn: &DatabaseConnection,
        input: AssetDiaryEntryCreateInput,
    ) -> Result<AssetDiaryEntryDto, AppError> {
        let now = now_ms();
        let model = AssetRepo::insert_diary_entry(
            conn,
            NewDiaryEntryRecord {
                id: Uuid::new_v4().to_string(),
                date: normalize_required(&input.date, "日记日期")?,
                title: normalize_required(&input.title, "日记标题")?,
                subtitle: normalize_optional(input.subtitle),
                content: input.content,
                tags: normalize_tags(input.tags),
                favorite: input.favorite,
                linked_task_ids: input.linked_task_ids,
                linked_project_id: normalize_optional(input.linked_project_id),
                sync_state: DEFAULT_SYNC_STATE.to_string(),
                created_at: now,
                updated_at: now,
            },
        )
        .await?;
        asset_repo_to_diary_entry_dto(model)
    }

    pub async fn update_diary_entry(
        conn: &DatabaseConnection,
        id: &str,
        patch: AssetDiaryEntryUpdatePatch,
    ) -> Result<(), AppError> {
        let now = now_ms();
        let model = AssetRepo::get_diary_entry_by_id(conn, id).await?;
        let mut active_model: crate::db::entities::asset_diary_entries::ActiveModel = model.into();
        if let Some(date) = patch.date {
            active_model.date = Set(normalize_required(&date, "日记日期")?);
        }
        if let Some(title) = patch.title {
            active_model.title = Set(normalize_required(&title, "日记标题")?);
        }
        if let Some(subtitle) = patch.subtitle {
            active_model.subtitle = Set(normalize_optional(subtitle));
        }
        if let Some(content) = patch.content {
            active_model.content = Set(content);
        }
        if let Some(tags) = patch.tags {
            active_model.tags = Set(serde_json::to_string(&normalize_tags(tags))
                .map_err(|error| AppError::Internal(format!("序列化日记标签失败：{error}")))?);
        }
        if let Some(favorite) = patch.favorite {
            active_model.favorite = Set(favorite);
        }
        if let Some(linked_task_ids) = patch.linked_task_ids {
            active_model.linked_task_ids = Set(serde_json::to_string(&linked_task_ids)
                .map_err(|error| AppError::Internal(format!("序列化日记任务关联失败：{error}")))?);
        }
        if let Some(linked_project_id) = patch.linked_project_id {
            active_model.linked_project_id = Set(normalize_optional(linked_project_id));
        }
        if let Some(sync_state) = patch.sync_state {
            active_model.sync_state = Set(normalize_sync_state(Some(sync_state)));
        }
        active_model.updated_at = Set(now);
        AssetRepo::update_diary_entry(conn, active_model).await?;
        Ok(())
    }

    pub async fn delete_diary_entry(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        AssetRepo::delete_diary_entry(conn, id).await
    }

    pub async fn create_vault_entry(
        conn: &DatabaseConnection,
        input: AssetVaultEntryCreateInput,
    ) -> Result<AssetVaultEntryDto, AppError> {
        let now = now_ms();
        let model = AssetRepo::insert_vault_entry(
            conn,
            NewVaultEntryRecord {
                id: Uuid::new_v4().to_string(),
                name: normalize_required(&input.name, "密钥名称")?,
                secret_type: normalize_required(&input.secret_type, "密钥类型")?,
                environment: normalize_optional(input.environment),
                value: input.value,
                folder: normalize_optional(input.folder),
                note: normalize_optional(input.note),
                tags: normalize_tags(input.tags),
                favorite: input.favorite,
                sync_state: DEFAULT_SYNC_STATE.to_string(),
                created_at: now,
                updated_at: now,
            },
        )
        .await?;
        asset_repo_to_vault_entry_dto(model)
    }

    pub async fn update_vault_entry(
        conn: &DatabaseConnection,
        id: &str,
        patch: AssetVaultEntryUpdatePatch,
    ) -> Result<(), AppError> {
        let now = now_ms();
        let model = AssetRepo::get_vault_entry_by_id(conn, id).await?;
        let mut active_model: crate::db::entities::asset_vault_entries::ActiveModel = model.into();
        if let Some(name) = patch.name {
            active_model.name = Set(normalize_required(&name, "密钥名称")?);
        }
        if let Some(secret_type) = patch.secret_type {
            active_model.secret_type = Set(normalize_required(&secret_type, "密钥类型")?);
        }
        if let Some(environment) = patch.environment {
            active_model.environment = Set(normalize_optional(environment));
        }
        if let Some(value) = patch.value {
            active_model.value = Set(value);
        }
        if let Some(folder) = patch.folder {
            active_model.folder = Set(normalize_optional(folder));
        }
        if let Some(note) = patch.note {
            active_model.note = Set(normalize_optional(note));
        }
        if let Some(tags) = patch.tags {
            active_model.tags = Set(serde_json::to_string(&normalize_tags(tags))
                .map_err(|error| AppError::Internal(format!("序列化密钥标签失败：{error}")))?);
        }
        if let Some(favorite) = patch.favorite {
            active_model.favorite = Set(favorite);
        }
        if let Some(sync_state) = patch.sync_state {
            active_model.sync_state = Set(normalize_sync_state(Some(sync_state)));
        }
        active_model.updated_at = Set(now);
        AssetRepo::update_vault_entry(conn, active_model).await?;
        Ok(())
    }

    pub async fn delete_vault_entry(conn: &DatabaseConnection, id: &str) -> Result<(), AppError> {
        AssetRepo::delete_vault_entry(conn, id).await
    }

    pub async fn get_migration_status(
        conn: &DatabaseConnection,
    ) -> Result<AssetsMigrationStatusDto, AppError> {
        AssetRepo::read_migration_status(conn).await
    }

    pub async fn import_legacy_assets(
        conn: &DatabaseConnection,
        bundle: LegacyAssetsBundle,
    ) -> Result<AssetsMigrationStatusDto, AppError> {
        let txn = conn.begin().await.map_err(AppError::from)?;

        for snippet in &bundle.snippets {
            AssetRepo::upsert_imported_snippet(&txn, snippet).await?;
        }
        for note in &bundle.notes {
            AssetRepo::upsert_imported_note(&txn, note).await?;
        }
        for diary_entry in &bundle.diary_entries {
            AssetRepo::upsert_imported_diary_entry(&txn, diary_entry).await?;
        }
        for vault_entry in &bundle.vault_entries {
            AssetRepo::upsert_imported_vault_entry(&txn, vault_entry).await?;
        }

        let migrated_at = now_ms();
        AssetRepo::write_migration_status(&txn, migrated_at).await?;
        txn.commit().await.map_err(AppError::from)?;

        Ok(AssetsMigrationStatusDto {
            done: true,
            migrated_at: Some(migrated_at),
        })
    }
}

pub(crate) fn asset_repo_to_snippet_dto(
    model: crate::db::entities::asset_snippets::Model,
) -> Result<AssetSnippetDto, AppError> {
    Ok(AssetSnippetDto {
        id: model.id,
        title: model.title,
        language: model.language,
        content: model.content,
        description: model.description,
        folder: model.folder,
        tags: serde_json::from_str(&model.tags)
            .map_err(|error| AppError::Internal(format!("反序列化代码片段标签失败：{error}")))?,
        favorite: model.favorite,
        linked_task_id: model.linked_task_id,
        linked_project_id: model.linked_project_id,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

pub(crate) fn asset_repo_to_note_dto(
    model: crate::db::entities::asset_notes::Model,
) -> Result<AssetNoteDto, AppError> {
    Ok(AssetNoteDto {
        id: model.id,
        title: model.title,
        content: model.content,
        excerpt: model.excerpt,
        tags: serde_json::from_str(&model.tags)
            .map_err(|error| AppError::Internal(format!("反序列化笔记标签失败：{error}")))?,
        favorite: model.favorite,
        linked_project_id: model.linked_project_id,
        linked_task_id: model.linked_task_id,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

pub(crate) fn asset_repo_to_diary_entry_dto(
    model: crate::db::entities::asset_diary_entries::Model,
) -> Result<AssetDiaryEntryDto, AppError> {
    Ok(AssetDiaryEntryDto {
        id: model.id,
        date: model.date,
        title: model.title,
        subtitle: model.subtitle,
        content: model.content,
        tags: serde_json::from_str(&model.tags)
            .map_err(|error| AppError::Internal(format!("反序列化日记标签失败：{error}")))?,
        favorite: model.favorite,
        linked_task_ids: serde_json::from_str(&model.linked_task_ids)
            .map_err(|error| AppError::Internal(format!("反序列化日记任务关联失败：{error}")))?,
        linked_project_id: model.linked_project_id,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}

pub(crate) fn asset_repo_to_vault_entry_dto(
    model: crate::db::entities::asset_vault_entries::Model,
) -> Result<AssetVaultEntryDto, AppError> {
    Ok(AssetVaultEntryDto {
        id: model.id,
        name: model.name,
        r#type: model.secret_type,
        environment: model.environment,
        value: model.value,
        folder: model.folder,
        note: model.note,
        tags: serde_json::from_str(&model.tags)
            .map_err(|error| AppError::Internal(format!("反序列化密钥标签失败：{error}")))?,
        favorite: model.favorite,
        sync_state: model.sync_state,
        created_at: model.created_at,
        updated_at: model.updated_at,
    })
}
