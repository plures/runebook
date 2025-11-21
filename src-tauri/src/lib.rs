use std::collections::HashMap;
use std::process::Command;
use serde::{Deserialize, Serialize};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[derive(Debug, Serialize, Deserialize)]
struct CommandResult {
    stdout: String,
    stderr: String,
    exit_code: i32,
}

#[tauri::command]
async fn execute_terminal_command(
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
    cwd: String,
) -> Result<String, String> {
    let mut cmd = Command::new(&command);
    
    // Add arguments
    cmd.args(&args);
    
    // Add environment variables
    for (key, value) in env {
        cmd.env(key, value);
    }
    
    // Set working directory if provided
    if !cwd.is_empty() {
        cmd.current_dir(&cwd);
    }
    
    // Execute command
    match cmd.output() {
        Ok(output) => {
            let stdout = String::from_utf8_lossy(&output.stdout).to_string();
            let stderr = String::from_utf8_lossy(&output.stderr).to_string();
            
            if output.status.success() {
                Ok(stdout)
            } else {
                Err(format!("Command failed: {}\n{}", stderr, stdout))
            }
        }
        Err(e) => Err(format!("Failed to execute command: {}", e)),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, execute_terminal_command])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
