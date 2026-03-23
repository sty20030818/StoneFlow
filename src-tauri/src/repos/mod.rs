//! 仓储层（Repository）模块。
//!
//! 职责：
//! - 提供查询构建与持久化原语
//! - 屏蔽 SeaORM 细节与关联表落库细节
//! - 为 service 提供可组合的数据访问步骤
//!
//! 非职责：
//! - 不承载完整业务用例
//! - 不统一管理事务边界
//! - 不决定跨实体副作用触发时机

pub mod activity_log_repo;
pub mod asset_repo;
pub mod common_task_utils;
pub mod link_repo;
pub mod project_repo;
pub mod space_repo;
pub mod tag_repo;
pub mod task_repo;
