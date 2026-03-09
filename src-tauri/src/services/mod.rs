//! 服务层模块。
//!
//! 服务层只负责写用例编排：
//! - 统一承接会修改持久化状态的命令入口
//! - 管理事务边界与跨实体副作用
//! - 协调多个 repo 完成完整业务流程
//!
//! 纯查询命令不强制经过 service，避免制造空壳透传层。

pub mod project_service;
pub mod sync_service;
pub mod task_service;

#[allow(unused_imports)]
pub use project_service::ProjectService;
#[allow(unused_imports)]
pub use sync_service::SyncService;
pub use task_service::{
    TaskCreateInput, TaskCreatePatch, TaskService, TaskUpdateInput, TaskUpdatePatch,
};
