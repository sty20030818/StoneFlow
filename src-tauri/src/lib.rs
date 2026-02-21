//! Tauri 后端入口（库模式）。
//!
//! 推荐阅读顺序（初学者）：
//! 1) `run()` 看应用如何组装
//! 2) `commands/*` 看前端调用 Rust 的边界
//! 3) `repos/*` 看业务读写和事务
//! 4) `db/*` 看数据库初始化、迁移、seed
//! 5) `types/*` 看 DTO 与错误映射
//!
//! 重点：命令层不写复杂业务，只做参数接收和错误映射。

mod commands;
mod db;
mod repos;
mod types;

use commands::hello::hello;
use commands::logs::list_activity_logs;
use commands::projects::{
    create_project, delete_project, get_default_project, list_deleted_projects, list_projects,
    rebalance_project_ranks, reorder_project, restore_project, update_project,
};
use commands::spaces::list_spaces;
use commands::sync::{pull_from_neon, push_to_neon, test_neon_connection};
use commands::tasks::{
    complete_task, create_task, create_task_with_patch, delete_tasks, list_deleted_tasks,
    list_tasks, rebalance_ranks, reorder_task, restore_tasks, update_task,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 重点：Builder 链式调用用于注册插件、生命周期钩子与命令路由。
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // setup 阶段执行一次：适合做目录初始化、密钥插件注册、数据库初始化。
            let data_dir = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path");
            std::fs::create_dir_all(&data_dir)?;
            let salt_path = data_dir.join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;

            // 重点：这里通过 async_runtime 阻塞等待初始化完成，确保命令注册后数据库可用。
            tauri::async_runtime::block_on(async move {
                let db_state = crate::db::init_db(app.handle()).await.map_err(Box::new)?;
                app.manage(db_state);
                Ok(())
            })
        })
        // invoke_handler 把前端可调用的 command 显式列在这里，便于审计接口边界。
        .invoke_handler(tauri::generate_handler![
            hello,
            list_projects,
            list_deleted_projects,
            create_project,
            update_project,
            get_default_project,
            delete_project,
            restore_project,
            list_spaces,
            list_activity_logs,
            list_tasks,
            list_deleted_tasks,
            create_task,
            create_task_with_patch,
            update_task,
            complete_task,
            delete_tasks,
            restore_tasks,
            reorder_task,
            rebalance_ranks,
            reorder_project,
            rebalance_project_ranks,
            pull_from_neon,
            push_to_neon,
            test_neon_connection
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
