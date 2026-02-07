mod commands;
mod db;
mod repos;
mod types;

use commands::hello::hello;
use commands::projects::{
    create_project, delete_project, get_default_project, list_deleted_projects, list_projects,
    rebalance_project_ranks, reorder_project, restore_project,
};
use commands::spaces::list_spaces;
use commands::sync::{pull_from_neon, push_to_neon, test_neon_connection};
use commands::tasks::{
    complete_task, create_task, delete_tasks, list_deleted_tasks, list_tasks, rebalance_ranks,
    reorder_task, restore_tasks, update_task,
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
            let data_dir = app
                .path()
                .app_local_data_dir()
                .expect("could not resolve app local data path");
            std::fs::create_dir_all(&data_dir)?;
            let salt_path = data_dir.join("salt.txt");
            app.handle()
                .plugin(tauri_plugin_stronghold::Builder::with_argon2(&salt_path).build())?;
            tauri::async_runtime::block_on(async move {
                let db_state = crate::db::init_db(app.handle()).await.map_err(Box::new)?;
                app.manage(db_state);
                Ok(())
            })
        })
        .invoke_handler(tauri::generate_handler![
            hello,
            list_projects,
            list_deleted_projects,
            create_project,
            get_default_project,
            delete_project,
            restore_project,
            list_spaces,
            list_tasks,
            list_deleted_tasks,
            create_task,
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
