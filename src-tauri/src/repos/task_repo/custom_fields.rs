//! custom_fields 序列化/反序列化与规范化。
//! 重点：仅支持 rank/title/value 结构。

use crate::types::{
    dto::{CustomFieldItemDto, CustomFieldsDto},
    error::AppError,
};

pub fn parse_from_json_string(raw: Option<&str>) -> Option<CustomFieldsDto> {
    // 反序列化失败时直接回退为 None，避免历史脏数据阻断列表读取。
    let raw = raw?;
    let mut parsed = serde_json::from_str::<CustomFieldsDto>(raw).ok()?;
    for item in &mut parsed.fields {
        if item.rank < 0 {
            item.rank = 0;
        }
    }
    parsed.fields.sort_by_key(|item| item.rank);
    Some(parsed)
}

/// 把自定义字段 DTO 序列化成数据库中的 JSON 字符串。
pub fn serialize_custom_fields(fields: &CustomFieldsDto) -> Result<String, AppError> {
    serde_json::to_string(fields)
        .map_err(|e| AppError::Validation(format!("customFields 序列化失败: {e}")))
}

/// 规范化自定义字段输入。
///
/// 这里会统一处理：
/// - rank 非负约束
/// - title 去空白
/// - value 的空串归一化
pub fn normalize_custom_fields(input: CustomFieldsDto) -> Result<CustomFieldsDto, AppError> {
    let mut normalized = Vec::with_capacity(input.fields.len());

    for item in input.fields {
        if item.rank < 0 {
            return Err(AppError::Validation(
                "customFields.rank 必须为非负整数".to_string(),
            ));
        }

        let title = item.title.trim().to_string();
        if title.is_empty() {
            return Err(AppError::Validation(
                "customFields.title 不能为空".to_string(),
            ));
        }

        let value = item
            .value
            .map(|text| text.trim().to_string())
            .filter(|text| !text.is_empty());

        normalized.push(CustomFieldItemDto {
            rank: item.rank,
            title,
            value,
        });
    }

    normalized.sort_by_key(|item| item.rank);

    Ok(CustomFieldsDto { fields: normalized })
}
