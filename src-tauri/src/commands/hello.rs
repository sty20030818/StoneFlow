//! 最小示例命令：用于验证前后端调用链路是否正常。
//! 重点：这个文件适合新手先看，理解 `#[tauri::command]` 的基本形态。

#[tauri::command]
pub fn hello(name: Option<String>) -> String {
    // 这里演示了常见的 Option 处理链：map -> filter -> unwrap_or_else。
    // 重点：`unwrap_or_else` 只在 None 时执行闭包，避免不必要分配。
    let name = name
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "StoneFlow".to_string());

    format!("Hello, {}! 来自 Rust", name)
}
