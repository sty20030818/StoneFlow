//! 命令层（Tauri command）模块。
//!
//! 这一层的职责：
//! - 接收前端参数（通常是 DTO）
//! - 调用 repo 层完成业务
//! - 把内部错误映射成可返回前端的 `ApiError`
//!
//! 非职责：
//! - 不做复杂业务编排
//! - 不直接操作数据库实体

pub mod hello;
pub mod logs;
pub mod projects;
pub mod spaces;
pub mod sync;
pub mod tasks;
