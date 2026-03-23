use serde::Deserialize;
use tauri::State;

use crate::{
    db::DbState,
    repos::asset_repo::AssetRepo,
    services::{
        AssetDiaryEntryCreateInput, AssetDiaryEntryUpdatePatch, AssetNoteCreateInput,
        AssetNoteUpdatePatch, AssetService, AssetSnippetCreateInput, AssetSnippetUpdatePatch,
        AssetVaultEntryCreateInput, AssetVaultEntryUpdatePatch, LegacyAssetsBundle,
    },
    types::{
        dto::{
            AssetDiaryEntryDto, AssetNoteDto, AssetSnippetDto, AssetVaultEntryDto,
            AssetsMigrationStatusDto,
        },
        error::ApiError,
    },
};

#[tauri::command]
pub async fn list_snippets(state: State<'_, DbState>) -> Result<Vec<AssetSnippetDto>, ApiError> {
    AssetRepo::list_snippets(&state.conn).await.map_err(ApiError::from)
}

#[tauri::command]
pub async fn list_notes(state: State<'_, DbState>) -> Result<Vec<AssetNoteDto>, ApiError> {
    AssetRepo::list_notes(&state.conn).await.map_err(ApiError::from)
}

#[tauri::command]
pub async fn list_diary_entries(
    state: State<'_, DbState>,
) -> Result<Vec<AssetDiaryEntryDto>, ApiError> {
    AssetRepo::list_diary_entries(&state.conn)
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
pub async fn list_vault_entries(
    state: State<'_, DbState>,
) -> Result<Vec<AssetVaultEntryDto>, ApiError> {
    AssetRepo::list_vault_entries(&state.conn)
        .await
        .map_err(ApiError::from)
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateSnippetArgs {
    pub title: String,
    pub language: String,
    pub content: String,
    pub description: Option<String>,
    pub folder: Option<String>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_task_id: Option<String>,
    pub linked_project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSnippetArgs {
    pub id: String,
    pub patch: UpdateSnippetPatch,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateSnippetPatch {
    pub title: Option<String>,
    pub language: Option<String>,
    pub content: Option<String>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub description: Option<Option<String>>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub folder: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub linked_task_id: Option<Option<String>>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub linked_project_id: Option<Option<String>>,
    pub sync_state: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateNoteArgs {
    pub title: String,
    pub content: String,
    pub excerpt: Option<String>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_project_id: Option<String>,
    pub linked_task_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNoteArgs {
    pub id: String,
    pub patch: UpdateNotePatch,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateNotePatch {
    pub title: Option<String>,
    pub content: Option<String>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub excerpt: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub linked_project_id: Option<Option<String>>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub linked_task_id: Option<Option<String>>,
    pub sync_state: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateDiaryEntryArgs {
    pub date: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub content: String,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_task_ids: Option<Vec<String>>,
    pub linked_project_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDiaryEntryArgs {
    pub id: String,
    pub patch: UpdateDiaryEntryPatch,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateDiaryEntryPatch {
    pub date: Option<String>,
    pub title: Option<String>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub subtitle: Option<Option<String>>,
    pub content: Option<String>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub linked_task_ids: Option<Vec<String>>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub linked_project_id: Option<Option<String>>,
    pub sync_state: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateVaultEntryArgs {
    pub name: String,
    pub r#type: String,
    pub environment: Option<String>,
    pub value: String,
    pub folder: Option<String>,
    pub note: Option<String>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVaultEntryArgs {
    pub id: String,
    pub patch: UpdateVaultEntryPatch,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateVaultEntryPatch {
    pub name: Option<String>,
    pub r#type: Option<String>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub environment: Option<Option<String>>,
    pub value: Option<String>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub folder: Option<Option<String>>,
    #[serde(default, with = "::serde_with::rust::double_option")]
    pub note: Option<Option<String>>,
    pub tags: Option<Vec<String>>,
    pub favorite: Option<bool>,
    pub sync_state: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeleteAssetArgs {
    pub id: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportLegacyAssetsArgs {
    pub snippets: Vec<AssetSnippetDto>,
    pub notes: Vec<AssetNoteDto>,
    pub diary_entries: Vec<AssetDiaryEntryDto>,
    pub vault_entries: Vec<AssetVaultEntryDto>,
}

#[tauri::command]
pub async fn create_snippet(
    state: State<'_, DbState>,
    args: CreateSnippetArgs,
) -> Result<AssetSnippetDto, ApiError> {
    AssetService::create_snippet(
        &state.conn,
        AssetSnippetCreateInput {
            title: args.title,
            language: args.language,
            content: args.content,
            description: args.description,
            folder: args.folder,
            tags: args.tags.unwrap_or_default(),
            favorite: args.favorite.unwrap_or(false),
            linked_task_id: args.linked_task_id,
            linked_project_id: args.linked_project_id,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn update_snippet(
    state: State<'_, DbState>,
    args: UpdateSnippetArgs,
) -> Result<(), ApiError> {
    AssetService::update_snippet(
        &state.conn,
        &args.id,
        AssetSnippetUpdatePatch {
            title: args.patch.title,
            language: args.patch.language,
            content: args.patch.content,
            description: args.patch.description,
            folder: args.patch.folder,
            tags: args.patch.tags,
            favorite: args.patch.favorite,
            linked_task_id: args.patch.linked_task_id,
            linked_project_id: args.patch.linked_project_id,
            sync_state: args.patch.sync_state,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn delete_snippet(
    state: State<'_, DbState>,
    args: DeleteAssetArgs,
) -> Result<(), ApiError> {
    AssetService::delete_snippet(&state.conn, &args.id)
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
pub async fn create_note(
    state: State<'_, DbState>,
    args: CreateNoteArgs,
) -> Result<AssetNoteDto, ApiError> {
    AssetService::create_note(
        &state.conn,
        AssetNoteCreateInput {
            title: args.title,
            content: args.content,
            excerpt: args.excerpt,
            tags: args.tags.unwrap_or_default(),
            favorite: args.favorite.unwrap_or(false),
            linked_project_id: args.linked_project_id,
            linked_task_id: args.linked_task_id,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn update_note(
    state: State<'_, DbState>,
    args: UpdateNoteArgs,
) -> Result<(), ApiError> {
    AssetService::update_note(
        &state.conn,
        &args.id,
        AssetNoteUpdatePatch {
            title: args.patch.title,
            content: args.patch.content,
            excerpt: args.patch.excerpt,
            tags: args.patch.tags,
            favorite: args.patch.favorite,
            linked_project_id: args.patch.linked_project_id,
            linked_task_id: args.patch.linked_task_id,
            sync_state: args.patch.sync_state,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn delete_note(
    state: State<'_, DbState>,
    args: DeleteAssetArgs,
) -> Result<(), ApiError> {
    AssetService::delete_note(&state.conn, &args.id)
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
pub async fn create_diary_entry(
    state: State<'_, DbState>,
    args: CreateDiaryEntryArgs,
) -> Result<AssetDiaryEntryDto, ApiError> {
    AssetService::create_diary_entry(
        &state.conn,
        AssetDiaryEntryCreateInput {
            date: args.date,
            title: args.title,
            subtitle: args.subtitle,
            content: args.content,
            tags: args.tags.unwrap_or_default(),
            favorite: args.favorite.unwrap_or(false),
            linked_task_ids: args.linked_task_ids.unwrap_or_default(),
            linked_project_id: args.linked_project_id,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn update_diary_entry(
    state: State<'_, DbState>,
    args: UpdateDiaryEntryArgs,
) -> Result<(), ApiError> {
    AssetService::update_diary_entry(
        &state.conn,
        &args.id,
        AssetDiaryEntryUpdatePatch {
            date: args.patch.date,
            title: args.patch.title,
            subtitle: args.patch.subtitle,
            content: args.patch.content,
            tags: args.patch.tags,
            favorite: args.patch.favorite,
            linked_task_ids: args.patch.linked_task_ids,
            linked_project_id: args.patch.linked_project_id,
            sync_state: args.patch.sync_state,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn delete_diary_entry(
    state: State<'_, DbState>,
    args: DeleteAssetArgs,
) -> Result<(), ApiError> {
    AssetService::delete_diary_entry(&state.conn, &args.id)
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
pub async fn create_vault_entry(
    state: State<'_, DbState>,
    args: CreateVaultEntryArgs,
) -> Result<AssetVaultEntryDto, ApiError> {
    AssetService::create_vault_entry(
        &state.conn,
        AssetVaultEntryCreateInput {
            name: args.name,
            secret_type: args.r#type,
            environment: args.environment,
            value: args.value,
            folder: args.folder,
            note: args.note,
            tags: args.tags.unwrap_or_default(),
            favorite: args.favorite.unwrap_or(false),
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn update_vault_entry(
    state: State<'_, DbState>,
    args: UpdateVaultEntryArgs,
) -> Result<(), ApiError> {
    AssetService::update_vault_entry(
        &state.conn,
        &args.id,
        AssetVaultEntryUpdatePatch {
            name: args.patch.name,
            secret_type: args.patch.r#type,
            environment: args.patch.environment,
            value: args.patch.value,
            folder: args.patch.folder,
            note: args.patch.note,
            tags: args.patch.tags,
            favorite: args.patch.favorite,
            sync_state: args.patch.sync_state,
        },
    )
    .await
    .map_err(ApiError::from)
}

#[tauri::command]
pub async fn delete_vault_entry(
    state: State<'_, DbState>,
    args: DeleteAssetArgs,
) -> Result<(), ApiError> {
    AssetService::delete_vault_entry(&state.conn, &args.id)
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
pub async fn get_assets_migration_status(
    state: State<'_, DbState>,
) -> Result<AssetsMigrationStatusDto, ApiError> {
    AssetService::get_migration_status(&state.conn)
        .await
        .map_err(ApiError::from)
}

#[tauri::command]
pub async fn import_legacy_assets(
    state: State<'_, DbState>,
    args: ImportLegacyAssetsArgs,
) -> Result<AssetsMigrationStatusDto, ApiError> {
    AssetService::import_legacy_assets(
        &state.conn,
        LegacyAssetsBundle {
            snippets: args.snippets,
            notes: args.notes,
            diary_entries: args.diary_entries,
            vault_entries: args.vault_entries,
        },
    )
    .await
    .map_err(ApiError::from)
}
