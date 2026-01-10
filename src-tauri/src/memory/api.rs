// Rust API layer for cognitive memory storage
// Provides: append_event, list_sessions, query_recent_errors, get_context, persist_suggestion

use crate::memory::client::PluresDBClient;
use crate::memory::schema::*;
use crate::memory::encryption::EncryptionProvider;
use anyhow::{Context, Result};
use chrono::{DateTime, Duration as ChronoDuration, Utc};
use serde_json::Value;
use std::collections::HashMap;

/// Main memory store API
pub struct MemoryStore {
    pub(crate) client: PluresDBClient,
    encryption: Option<Box<dyn EncryptionProvider>>,
}

impl MemoryStore {
    pub async fn new(client: PluresDBClient) -> Result<Self> {
        // TODO: Initialize encryption if configured
        let encryption: Option<Box<dyn EncryptionProvider>> = None;
        
        Ok(Self {
            client,
            encryption,
        })
    }

    /// Append an event to memory storage
    pub async fn append_event(&self, event: MemoryEvent) -> Result<()> {
        let key = format!("memory:event:{}", event.id);
        let value = serde_json::to_value(&event)?;
        
        // Encrypt if encryption is enabled
        let value = if let Some(enc) = &self.encryption {
            enc.encrypt(&value).await?
        } else {
            value
        };
        
        self.client.put(&key, &value).await?;
        
        // Also update session if it's a session event
        if event.event_type == "session_start" {
            if let Ok(session) = serde_json::from_value::<Session>(event.data.clone()) {
                let session_key = format!("memory:session:{}", session.id);
                self.client.put(&session_key, &serde_json::to_value(&session)?).await?;
            }
        }
        
        // Store provenance if provided
        if let Some(prov) = event.provenance {
            let prov_key = format!("memory:provenance:{}", prov.id);
            self.client.put(&prov_key, &serde_json::to_value(&prov)?).await?;
        }
        
        Ok(())
    }

    /// List all sessions
    pub async fn list_sessions(&self) -> Result<Vec<Session>> {
        let keys = self.client.list("memory:session:").await?;
        let mut sessions = Vec::new();
        
        for key in keys {
            if let Some(value) = self.client.get(&key).await? {
                // Decrypt if encryption is enabled
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(session) = serde_json::from_value::<Session>(value) {
                    sessions.push(session);
                }
            }
        }
        
        // Sort by started_at descending
        sessions.sort_by(|a, b| b.started_at.cmp(&a.started_at));
        
        Ok(sessions)
    }

    /// Query recent errors
    pub async fn query_recent_errors(
        &self,
        limit: Option<usize>,
        since: Option<DateTime<Utc>>,
        severity: Option<&str>,
    ) -> Result<Vec<Error>> {
        let keys = self.client.list("memory:error:").await?;
        let mut errors = Vec::new();
        
        for key in keys {
            if let Some(value) = self.client.get(&key).await? {
                // Decrypt if encryption is enabled
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(error) = serde_json::from_value::<Error>(value) {
                    // Filter by timestamp
                    if let Some(since_time) = since {
                        if error.timestamp < since_time {
                            continue;
                        }
                    }
                    
                    // Filter by severity
                    if let Some(sev) = severity {
                        if error.severity != sev {
                            continue;
                        }
                    }
                    
                    errors.push(error);
                }
            }
        }
        
        // Sort by timestamp descending
        errors.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        
        // Apply limit
        if let Some(limit) = limit {
            errors.truncate(limit);
        }
        
        Ok(errors)
    }

    /// Get context window for analysis
    pub async fn get_context(
        &self,
        session_id: &str,
        window: ChronoDuration,
    ) -> Result<ContextWindow> {
        let end_time = Utc::now();
        let start_time = end_time - window;
        
        // Get session
        let session_key = format!("memory:session:{}", session_id);
        let session: Session = if let Some(value) = self.client.get(&session_key).await? {
            let value = if let Some(enc) = &self.encryption {
                enc.decrypt(&value).await?
            } else {
                value
            };
            serde_json::from_value(value).context("Failed to deserialize session")?
        } else {
            anyhow::bail!("Session not found: {}", session_id);
        };
        
        // Get commands in time window
        let command_keys = self.client.list("memory:command:").await?;
        let mut commands = Vec::new();
        for key in command_keys {
            if let Some(value) = self.client.get(&key).await? {
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(cmd) = serde_json::from_value::<Command>(value) {
                    if cmd.session_id == session_id
                        && cmd.started_at >= start_time
                        && cmd.started_at <= end_time
                    {
                        commands.push(cmd);
                    }
                }
            }
        }
        commands.sort_by(|a, b| a.started_at.cmp(&b.started_at));
        
        // Get outputs for these commands
        let output_keys = self.client.list("memory:output:").await?;
        let mut outputs = Vec::new();
        let command_ids: std::collections::HashSet<String> = commands.iter().map(|c| c.id.clone()).collect();
        for key in output_keys {
            if let Some(value) = self.client.get(&key).await? {
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(output) = serde_json::from_value::<Output>(value) {
                    if command_ids.contains(&output.command_id) {
                        outputs.push(output);
                    }
                }
            }
        }
        outputs.sort_by(|a, b| a.chunk_index.cmp(&b.chunk_index));
        
        // Get errors in time window
        let error_keys = self.client.list("memory:error:").await?;
        let mut errors = Vec::new();
        for key in error_keys {
            if let Some(value) = self.client.get(&key).await? {
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(error) = serde_json::from_value::<Error>(value) {
                    if error.session_id == session_id
                        && error.timestamp >= start_time
                        && error.timestamp <= end_time
                    {
                        errors.push(error);
                    }
                }
            }
        }
        errors.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        
        // Get insights
        let insight_keys = self.client.list("memory:insight:").await?;
        let mut insights = Vec::new();
        for key in insight_keys {
            if let Some(value) = self.client.get(&key).await? {
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(insight) = serde_json::from_value::<Insight>(value) {
                    if insight.session_id.as_ref().map(|s| s.as_str()) == Some(session_id)
                        && insight.generated_at >= start_time
                        && insight.generated_at <= end_time
                    {
                        insights.push(insight);
                    }
                }
            }
        }
        insights.sort_by(|a, b| a.generated_at.cmp(&b.generated_at));
        
        Ok(ContextWindow {
            session_id: session_id.to_string(),
            start_time,
            end_time,
            commands,
            outputs,
            errors,
            insights,
        })
    }

    /// Persist a suggestion
    pub async fn persist_suggestion(&self, suggestion: Suggestion) -> Result<()> {
        let key = format!("memory:suggestion:{}", suggestion.id);
        let value = serde_json::to_value(&suggestion)?;
        
        // Encrypt if encryption is enabled
        let value = if let Some(enc) = &self.encryption {
            enc.encrypt(&value).await?
        } else {
            value
        };
        
        self.client.put(&key, &value).await?;
        Ok(())
    }

    /// Get all suggestions, optionally filtered by priority
    pub async fn get_suggestions(
        &self,
        priority: Option<&str>,
        limit: Option<usize>,
    ) -> Result<Vec<Suggestion>> {
        let keys = self.client.list("memory:suggestion:").await?;
        let mut suggestions = Vec::new();
        
        for key in keys {
            if let Some(value) = self.client.get(&key).await? {
                let value = if let Some(enc) = &self.encryption {
                    enc.decrypt(&value).await?
                } else {
                    value
                };
                
                if let Ok(suggestion) = serde_json::from_value::<Suggestion>(value) {
                    // Filter by priority if specified
                    if let Some(pri) = priority {
                        if suggestion.priority != pri {
                            continue;
                        }
                    }
                    
                    // Skip dismissed suggestions
                    if suggestion.dismissed {
                        continue;
                    }
                    
                    suggestions.push(suggestion);
                }
            }
        }
        
        // Sort by rank descending
        suggestions.sort_by(|a, b| b.rank.partial_cmp(&a.rank).unwrap_or(std::cmp::Ordering::Equal));
        
        // Apply limit
        if let Some(limit) = limit {
            suggestions.truncate(limit);
        }
        
        Ok(suggestions)
    }

    /// Store a command
    pub async fn store_command(&self, command: Command) -> Result<()> {
        let key = format!("memory:command:{}", command.id);
        let value = serde_json::to_value(&command)?;
        
        let value = if let Some(enc) = &self.encryption {
            enc.encrypt(&value).await?
        } else {
            value
        };
        
        self.client.put(&key, &value).await?;
        Ok(())
    }

    /// Store an output chunk (with optional compression)
    pub async fn store_output(&self, output: &mut Output, compress: bool) -> Result<()> {
        if compress && !output.compressed {
            use flate2::Compression;
            use flate2::write::GzEncoder;
            use std::io::Write;
            
            let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
            encoder.write_all(&output.content)?;
            let compressed = encoder.finish()?;
            
            output.content = compressed;
            output.compressed = true;
        }
        
        let key = format!("memory:output:{}", output.id);
        let value = serde_json::to_value(output)?;
        
        let value = if let Some(enc) = &self.encryption {
            enc.encrypt(&value).await?
        } else {
            value
        };
        
        self.client.put(&key, &value).await?;
        Ok(())
    }

    /// Store an error
    pub async fn store_error(&self, error: Error) -> Result<()> {
        let key = format!("memory:error:{}", error.id);
        let value = serde_json::to_value(&error)?;
        
        let value = if let Some(enc) = &self.encryption {
            enc.encrypt(&value).await?
        } else {
            value
        };
        
        self.client.put(&key, &value).await?;
        Ok(())
    }

    /// Store an insight
    pub async fn store_insight(&self, insight: Insight) -> Result<()> {
        let key = format!("memory:insight:{}", insight.id);
        let value = serde_json::to_value(&insight)?;
        
        let value = if let Some(enc) = &self.encryption {
            enc.encrypt(&value).await?
        } else {
            value
        };
        
        self.client.put(&key, &value).await?;
        Ok(())
    }

    /// Wipe all memory data (for testing/cleanup)
    pub async fn wipe_all(&self) -> Result<()> {
        let prefixes = vec![
            "memory:session:",
            "memory:command:",
            "memory:output:",
            "memory:error:",
            "memory:insight:",
            "memory:suggestion:",
            "memory:provenance:",
            "memory:event:",
        ];
        
        for prefix in prefixes {
            let keys = self.client.list(prefix).await?;
            for key in keys {
                self.client.delete(&key).await?;
            }
        }
        
        Ok(())
    }
}

