pub mod agents;
pub mod core;
pub mod execution;
pub mod memory;
pub mod orchestrator;

use std::collections::HashMap;
use std::process::Command;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
async fn memory_inspect(
    host: Option<String>,
    port: Option<u16>,
    data_dir: Option<String>,
) -> Result<String, String> {
    use crate::memory::*;

    let host = host.as_deref().unwrap_or("localhost");
    let port = port.unwrap_or(34567);
    let data_dir = data_dir.as_deref().unwrap_or("./pluresdb-data");

    match init_memory_store(host, port, data_dir).await {
        Ok(store) => {
            let sessions = store
                .list_sessions()
                .await
                .map_err(|e| format!("Failed to list sessions: {}", e))?;
            let errors = store
                .query_recent_errors(Some(10), None, None)
                .await
                .map_err(|e| format!("Failed to query errors: {}", e))?;
            let suggestions = store
                .get_suggestions(None, Some(10))
                .await
                .map_err(|e| format!("Failed to get suggestions: {}", e))?;

            let mut output = String::new();
            output.push_str("=== RuneBook Cognitive Memory ===\n\n");
            output.push_str(&format!("Sessions: {}\n", sessions.len()));
            output.push_str(&format!("Recent Errors: {}\n", errors.len()));
            output.push_str(&format!("Active Suggestions: {}\n\n", suggestions.len()));

            if !sessions.is_empty() {
                output.push_str("=== Recent Sessions ===\n");
                for session in sessions.iter().take(5) {
                    output.push_str(&format!(
                        "  {} - {} (started: {})\n",
                        session.id,
                        session.shell_type,
                        session.started_at.format("%Y-%m-%d %H:%M:%S")
                    ));
                }
                output.push_str("\n");
            }

            if !errors.is_empty() {
                output.push_str("=== Recent Errors ===\n");
                for error in errors.iter().take(5) {
                    output.push_str(&format!(
                        "  [{}] {} - {}\n",
                        error.severity, error.error_type, error.message
                    ));
                }
                output.push_str("\n");
            }

            if !suggestions.is_empty() {
                output.push_str("=== Top Suggestions ===\n");
                for suggestion in suggestions.iter().take(5) {
                    output.push_str(&format!(
                        "  [{}] {} - {}\n",
                        suggestion.priority, suggestion.title, suggestion.description
                    ));
                }
            }

            Ok(output)
        }
        Err(e) => Err(format!("Failed to initialize memory store: {}", e)),
    }
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
    // Initialize logger (ignore error if already initialized)
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            execute_terminal_command,
            memory_inspect
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
