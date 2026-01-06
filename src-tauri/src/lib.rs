mod commands;
mod db;
mod repos;
mod types;

use commands::hello::hello;
use commands::projects::{create_project, list_projects};
use commands::spaces::list_spaces;
use commands::tasks::{complete_task, create_task, list_tasks, update_task, update_task_timeline};
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            // 注意：不要在 Tauri 启动前做 I/O。初始化数据库必须放在 setup 里。
            let db_state = crate::db::init_db(app.handle())
                .map_err(|e| Box::new(e) as Box<dyn std::error::Error>)?;
            app.manage(db_state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            hello,
            list_spaces,
            list_projects,
            create_project,
            list_tasks,
            create_task,
            update_task,
            complete_task,
            update_task_timeline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
