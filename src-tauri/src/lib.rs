pub mod agents;
pub mod core;
pub mod execution;
pub mod memory;
pub mod orchestrator;

use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::{Arc, Mutex};

use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use tauri::{AppHandle, Emitter};

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ── PTY session management ────────────────────────────────────────────────────

struct PtySession {
    master: Box<dyn portable_pty::MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn portable_pty::Child + Send + Sync>,
}

struct PtyManager {
    sessions: HashMap<String, PtySession>,
}

impl PtyManager {
    fn new() -> Self {
        Self {
            sessions: HashMap::new(),
        }
    }
}

type PtyState = Arc<Mutex<PtyManager>>;

#[tauri::command]
async fn spawn_terminal(
    state: tauri::State<'_, PtyState>,
    app: AppHandle,
    shell: Option<String>,
    cwd: Option<String>,
    env: Option<HashMap<String, String>>,
    cols: Option<u16>,
    rows: Option<u16>,
) -> Result<String, String> {
    let terminal_id = uuid::Uuid::new_v4().to_string();

    let shell_cmd = shell.unwrap_or_else(|| {
        if cfg!(windows) {
            "powershell.exe".to_string()
        } else {
            std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
        }
    });

    let pty_system = native_pty_system();
    let pty_size = PtySize {
        rows: rows.unwrap_or(24),
        cols: cols.unwrap_or(80),
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system.openpty(pty_size).map_err(|e| e.to_string())?;

    let mut cmd = CommandBuilder::new(&shell_cmd);
    if let Some(ref cwd_path) = cwd {
        if !cwd_path.is_empty() {
            cmd.cwd(cwd_path);
        }
    }
    if let Some(env_vars) = env {
        for (k, v) in env_vars {
            // Validate env var names: only allow alphanumeric and underscore.
            if k.chars().all(|c| c.is_alphanumeric() || c == '_') {
                cmd.env(k, v);
            } else {
                log::warn!("[spawn_terminal] Skipping invalid env var name: {:?}", k);
            }
        }
    }

    let child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    // Close the slave side in the parent process
    drop(pair.slave);

    let mut master = pair.master;
    let writer = master.take_writer().map_err(|e| e.to_string())?;
    let mut reader = master.try_clone_reader().map_err(|e| e.to_string())?;

    // Spawn a thread to read PTY output and emit Tauri events
    let tid = terminal_id.clone();
    let app_clone = app.clone();
    let state_arc = Arc::clone(state.inner());
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) | Err(_) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_clone.emit(&format!("terminal-output-{}", tid), data);
                }
            }
        }
        // PTY closed — child process has exited. Retrieve the real exit code.
        // child.wait() should return immediately since the PTY closed.
        // portable_pty's ExitStatus only exposes success() (no numeric code),
        // so we map success → 0 and failure → 1; -1 if the session is gone.
        let exit_code: i32 = state_arc
            .lock()
            .ok()
            .and_then(|mut mgr| mgr.sessions.get_mut(&tid).map(|s| s.child.wait()))
            .and_then(|r| r.ok())
            .map(|status| if status.success() { 0 } else { 1 })
            .unwrap_or(-1);
        let _ = app_clone.emit(&format!("terminal-exit-{}", tid), exit_code);
    });

    let mut mgr = state.lock().map_err(|e| e.to_string())?;
    mgr.sessions.insert(
        terminal_id.clone(),
        PtySession {
            master,
            writer,
            child,
        },
    );

    Ok(terminal_id)
}

#[tauri::command]
async fn write_terminal(
    state: tauri::State<'_, PtyState>,
    terminal_id: String,
    data: String,
) -> Result<(), String> {
    let mut mgr = state.lock().map_err(|e| e.to_string())?;
    let session = mgr
        .sessions
        .get_mut(&terminal_id)
        .ok_or_else(|| format!("Terminal {} not found", terminal_id))?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn resize_terminal(
    state: tauri::State<'_, PtyState>,
    terminal_id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    // resize() sends a non-blocking TIOCSWINSZ ioctl (SIGWINCH signal) —
    // it does not perform blocking I/O, so holding the lock during the call
    // is safe and avoids a window where the session appears "not found".
    let mgr = state.lock().map_err(|e| e.to_string())?;
    let session = mgr
        .sessions
        .get(&terminal_id)
        .ok_or_else(|| format!("Terminal {} not found", terminal_id))?;
    session
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn kill_terminal(
    state: tauri::State<'_, PtyState>,
    terminal_id: String,
) -> Result<(), String> {
    let mut mgr = state.lock().map_err(|e| e.to_string())?;
    if let Some(mut session) = mgr.sessions.remove(&terminal_id) {
        // First, attempt to terminate the child process.
        session.child.kill().map_err(|e| e.to_string())?;
        // Then, wait for the child to exit to ensure it is properly reaped
        // and does not remain as a zombie process on supported platforms.
        let _ = session.child.wait();
    }
    Ok(())
}

// ── Memory inspection ─────────────────────────────────────────────────────────

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize logger (ignore error if already initialized)
    let _ = env_logger::try_init();

    tauri::Builder::default()
        .manage(Arc::new(Mutex::new(PtyManager::new())) as PtyState)
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            memory_inspect,
            spawn_terminal,
            write_terminal,
            resize_terminal,
            kill_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
