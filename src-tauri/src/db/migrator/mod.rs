//! 迁移入口。
//! 重点：所有 schema 变更都应进入 migration，而不是手工改库。

use sea_orm_migration::prelude::*;

mod m01_init;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        // 新迁移按时间/版本顺序追加。
        vec![Box::new(m01_init::Migration)]
    }
}
