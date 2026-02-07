//! custom_fields 序列化/反序列化与规范化。
//! 重点：入库前做 key/label 去空校验，并用 BTreeMap 做稳定去重。

use std::collections::BTreeMap;

use crate::types::{
    dto::{CustomFieldItemDto, CustomFieldsDto},
    error::AppError,
};
use serde_json;

pub fn parse_from_json_string(raw: Option<&str>) -> Option<CustomFieldsDto> {
    // 解析失败返回 None，避免脏数据导致整个列表接口失败。
    raw.and_then(|value| serde_json::from_str::<CustomFieldsDto>(value).ok())
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
        // 相同 key 后写覆盖前写，确保最终 key 唯一。
        map.insert(key.clone(), CustomFieldItemDto { key, label, value });
    }

    Ok(CustomFieldsDto {
        fields: map.into_values().collect(),
    })
}
