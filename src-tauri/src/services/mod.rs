//! 服务层模块。
//!
//! 服务层只负责写用例编排：
//! - 统一承接会修改持久化状态的命令入口
//! - 管理事务边界与跨实体副作用
//! - 协调多个 repo 完成完整业务流程
//!
//! 纯查询命令不强制经过 service，避免制造空壳透传层。

pub mod project;
pub mod sync;
pub mod task;

#[allow(unused_imports)]
pub use project::ProjectService;
pub use project::{ProjectCreateInput, ProjectUpdateInput, ProjectUpdatePatch};
pub use sync::{DatabaseUrlArgs, SyncCommandReport, SyncService};
pub use task::{TaskCreateInput, TaskCreatePatch, TaskService, TaskUpdateInput, TaskUpdatePatch};
