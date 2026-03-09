//! 远程同步写用例服务。
//!
//! 本模块将承接 pull / push / 连接测试等同步流程，
//! 统一管理远程连接、冲突决策、批量 upsert 与同步水位更新。

pub struct SyncService;
