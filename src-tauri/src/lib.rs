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
    // Basic input validation to prevent common issues
    if command.trim().is_empty() {
        return Err("Command cannot be empty".to_string());
    }
    
    // Prevent command chaining attacks via common shell operators
    let dangerous_chars = ['|', ';', '&', '>', '<', '`', '$', '(', ')'];
    if command.chars().any(|c| dangerous_chars.contains(&c)) {
        return Err("Command contains potentially dangerous characters. RuneBook executes commands directly without shell interpretation for security.".to_string());
    }
    
    // Validate environment variable keys (no special chars)
    for key in env.keys() {
        if !key.chars().all(|c| c.is_alphanumeric() || c == '_') {
            return Err(format!("Invalid environment variable name: {}", key));
        }
    }
    
    // Note: This executes the command directly without a shell, which prevents
    // shell injection attacks. Command::new does not interpret shell syntax.
    let mut cmd = Command::new(&command);
    
    // Add arguments - each arg is passed as-is, not interpreted by a shell
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
