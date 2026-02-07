//! 仓储层（Repository）模块。
//!
//! 职责：
//! - 面向业务聚合查询与写入
//! - 统一管理事务和一致性
//! - 把数据库实体映射为 DTO
//!
//! 重点：命令层应调用 repo，而不是直接操作 SeaORM Entity。

pub mod common_task_utils;
pub mod link_repo;
pub mod project_repo;
pub mod space_repo;
pub mod tag_repo;
pub mod task_repo;
