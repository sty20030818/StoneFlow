#[tauri::command]
pub fn hello(name: Option<String>) -> String {
    let name = name
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "StoneFlow".to_string());

    format!("Hello, {}! 来自 Rust", name)
}


