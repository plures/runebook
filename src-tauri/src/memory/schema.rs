// Schema definitions for cognitive memory storage
// Defines tables/collections: sessions, commands, outputs, errors, insights, suggestions, provenance

use serde::{Deserialize, Serialize};
use chrono::{DateTime, Utc};
use uuid::Uuid;

/// Session metadata - represents a terminal session
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Session {
    pub id: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub shell_type: String, // bash, zsh, nushell, etc.
    pub initial_cwd: String,
    pub hostname: Option<String>,
    pub user: Option<String>,
    pub metadata: serde_json::Value, // Additional session metadata
}

/// Normalized command record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Command {
    pub id: String,
    pub session_id: String,
    pub command: String, // Normalized command (e.g., "git" not "/usr/bin/git")
    pub args: Vec<String>,
    pub env_summary: serde_json::Value, // Sanitized environment variables
    pub cwd: String,
    pub started_at: DateTime<Utc>,
    pub ended_at: Option<DateTime<Utc>>,
    pub exit_code: Option<i32>,
    pub success: bool,
    pub duration_ms: Option<u64>,
    pub pid: Option<u32>,
}

/// Output chunk - stdout/stderr output, optionally compressed
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Output {
    pub id: String,
    pub command_id: String,
    pub stream_type: String, // "stdout" or "stderr"
    pub chunk_index: u32,
    pub content: Vec<u8>, // Raw bytes (may be compressed)
    pub compressed: bool, // Whether content is gzip-compressed
    pub size_bytes: u64, // Uncompressed size
    pub timestamp: DateTime<Utc>,
}

/// Classified error record
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Error {
    pub id: String,
    pub command_id: String,
    pub session_id: String,
    pub error_type: String, // "exit_code", "stderr", "timeout", "permission", etc.
    pub severity: String, // "low", "medium", "high", "critical"
    pub message: String,
    pub stderr_snippet: Option<String>, // First 500 chars of stderr
    pub exit_code: Option<i32>,
    pub timestamp: DateTime<Utc>,
    pub context: serde_json::Value, // Additional error context
}

/// AI/heuristic annotation/insight
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Insight {
    pub id: String,
    pub command_id: Option<String>, // Optional: linked to specific command
    pub session_id: Option<String>, // Optional: linked to specific session
    pub insight_type: String, // "pattern", "optimization", "warning", "tip", "correlation"
    pub title: String,
    pub description: String,
    pub confidence: f64, // 0.0 to 1.0
    pub source: String, // "heuristic", "ai", "rule", etc.
    pub generated_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

/// Ranked suggestion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Suggestion {
    pub id: String,
    pub suggestion_type: String, // "command", "optimization", "shortcut", "warning", "tip"
    pub priority: String, // "low", "medium", "high"
    pub rank: f64, // Ranking score (higher = more relevant)
    pub title: String,
    pub description: String,
    pub command: Option<String>, // Suggested command
    pub args: Option<Vec<String>>, // Suggested arguments
    pub context: serde_json::Value,
    pub created_at: DateTime<Utc>,
    pub dismissed: bool,
    pub applied: bool,
}

/// Provenance information - tracks source, confidence, model/tool used
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provenance {
    pub id: String,
    pub entity_type: String, // "command", "output", "error", "insight", "suggestion"
    pub entity_id: String,
    pub source: String, // "terminal", "ai", "heuristic", "user", etc.
    pub confidence: Option<f64>, // 0.0 to 1.0
    pub model: Option<String>, // AI model name if applicable
    pub tool: Option<String>, // Tool/function name if applicable
    pub created_at: DateTime<Utc>,
    pub metadata: serde_json::Value,
}

/// Event wrapper for append_event API
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEvent {
    pub id: String,
    pub event_type: String, // "command", "output", "error", "session_start", "session_end"
    pub timestamp: DateTime<Utc>,
    pub session_id: String,
    pub data: serde_json::Value, // Event-specific data
    pub provenance: Option<Provenance>,
}

/// Context window for analysis
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextWindow {
    pub session_id: String,
    pub start_time: DateTime<Utc>,
    pub end_time: DateTime<Utc>,
    pub commands: Vec<Command>,
    pub outputs: Vec<Output>,
    pub errors: Vec<Error>,
    pub insights: Vec<Insight>,
}

impl Session {
    pub fn new(shell_type: String, initial_cwd: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            started_at: Utc::now(),
            ended_at: None,
            shell_type,
            initial_cwd,
            hostname: None,
            user: None,
            metadata: serde_json::json!({}),
        }
    }
}

impl Command {
    pub fn new(session_id: String, command: String, args: Vec<String>, cwd: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            session_id,
            command,
            args,
            env_summary: serde_json::json!({}),
            cwd,
            started_at: Utc::now(),
            ended_at: None,
            exit_code: None,
            success: false,
            duration_ms: None,
            pid: None,
        }
    }
}

impl Output {
    pub fn new(command_id: String, stream_type: String, chunk_index: u32, content: Vec<u8>) -> Self {
        let size_bytes = content.len() as u64;
        Self {
            id: Uuid::new_v4().to_string(),
            command_id,
            stream_type,
            chunk_index,
            content,
            compressed: false,
            size_bytes,
            timestamp: Utc::now(),
        }
    }
}

impl Error {
    pub fn new(
        command_id: String,
        session_id: String,
        error_type: String,
        severity: String,
        message: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            command_id,
            session_id,
            error_type,
            severity,
            message,
            stderr_snippet: None,
            exit_code: None,
            timestamp: Utc::now(),
            context: serde_json::json!({}),
        }
    }
}

impl Insight {
    pub fn new(
        insight_type: String,
        title: String,
        description: String,
        confidence: f64,
        source: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            command_id: None,
            session_id: None,
            insight_type,
            title,
            description,
            confidence,
            source,
            generated_at: Utc::now(),
            metadata: serde_json::json!({}),
        }
    }
}

impl Suggestion {
    pub fn new(
        suggestion_type: String,
        priority: String,
        rank: f64,
        title: String,
        description: String,
    ) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            suggestion_type,
            priority,
            rank,
            title,
            description,
            command: None,
            args: None,
            context: serde_json::json!({}),
            created_at: Utc::now(),
            dismissed: false,
            applied: false,
        }
    }
}

impl Provenance {
    pub fn new(entity_type: String, entity_id: String, source: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            entity_type,
            entity_id,
            source,
            confidence: None,
            model: None,
            tool: None,
            created_at: Utc::now(),
            metadata: serde_json::json!({}),
        }
    }
}

