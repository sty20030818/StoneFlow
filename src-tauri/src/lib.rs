mod commands;
mod db;
mod repos;
mod types;

use commands::hello::hello;
use commands::projects::{
    create_project, get_default_project, list_projects, rebalance_project_ranks, reorder_project,
};
use commands::spaces::list_spaces;
use commands::sync::{pull_from_neon, push_to_neon};
use commands::tasks::{
    complete_task, create_task, delete_tasks, list_tasks, rebalance_ranks, reorder_task,
    update_task,
};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                let db_state = crate::db::init_db(app.handle())
                    .await
                    .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
                app.manage(db_state);
                Ok(())
            })
        })
        .invoke_handler(tauri::generate_handler![
            hello,
            list_projects,
            create_project,
            get_default_project,
            list_spaces,
            list_tasks,
            create_task,
            update_task,
            complete_task,
            delete_tasks,
            reorder_task,
            rebalance_ranks,
            reorder_project,
            rebalance_project_ranks,
            pull_from_neon,
            push_to_neon
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
