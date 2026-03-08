//! 服务层模块。
//!
//! 服务层职责：
//! - 业务编排：协调多个 Repository 完成复杂业务流程
//! - 事务管理：定义事务边界，保证数据一致性
//! - 业务规则：实现跨实体的业务逻辑
//!
//! 分层架构：
//! Commands → Services → Repositories → Entities

pub mod task_service;

pub use task_service::TaskService;
