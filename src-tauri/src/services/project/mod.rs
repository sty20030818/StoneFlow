//! 项目写用例服务。
//!
//! 本模块将承接项目创建、更新、删除子树、恢复、归档、
//! 取消归档与排序等写用例，并统一管理跨 repo 事务编排。

mod archive;
mod create;
mod delete_subtree;
mod dto;
mod helpers;
mod reorder;
mod restore;
mod update;

pub use dto::{ProjectCreateInput, ProjectUpdateInput, ProjectUpdatePatch};

pub struct ProjectService;
