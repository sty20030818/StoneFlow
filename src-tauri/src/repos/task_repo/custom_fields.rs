use std::collections::BTreeMap;

use crate::types::{
    dto::{CustomFieldItemDto, CustomFieldsDto},
    error::AppError,
};
use serde_json;

pub fn parse_custom_fields(raw: Option<String>) -> Option<CustomFieldsDto> {
    raw.and_then(|value| serde_json::from_str::<CustomFieldsDto>(&value).ok())
}

pub fn serialize_custom_fields(fields: &CustomFieldsDto) -> Result<String, AppError> {
    serde_json::to_string(fields)
        .map_err(|e| AppError::Validation(format!("customFields 序列化失败: {e}")))
}

pub fn normalize_custom_fields(input: CustomFieldsDto) -> Result<CustomFieldsDto, AppError> {
    let mut map: BTreeMap<String, CustomFieldItemDto> = BTreeMap::new();

    for item in input.fields {
        let key = item.key.trim().to_string();
        if key.is_empty() {
            return Err(AppError::Validation(
                "customFields.key 不能为空".to_string(),
            ));
        }
        let label = item.label.trim().to_string();
        if label.is_empty() {
            return Err(AppError::Validation(
                "customFields.label 不能为空".to_string(),
            ));
        }
        let value = item.value.map(|v| v.trim().to_string());
        map.insert(key.clone(), CustomFieldItemDto { key, label, value });
    }

    Ok(CustomFieldsDto {
        fields: map.into_values().collect(),
    })
}
