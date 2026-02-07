//! 二进制入口（main.rs）。
//! 这里保持最薄：只做平台级编译属性和转发到库入口。
//! 重点：把业务逻辑放在 `lib.rs`，可以让测试/复用更容易。

// 防止 Windows 在 Release 模式下额外弹出控制台窗口（不要删除）
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    // 重点：真正的应用初始化在库入口，避免 `main.rs` 变成“大杂烩”。
    stoneflow_lib::run()
}
