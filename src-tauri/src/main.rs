// 防止 Windows 在 Release 模式下额外弹出控制台窗口（不要删除）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    stoneflow_lib::run()
}
