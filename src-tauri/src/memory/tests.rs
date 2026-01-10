// Tests for cognitive memory storage
// Property tests and integration tests

#[cfg(test)]
mod tests {
    use crate::memory::*;
    use crate::memory::schema::*;
    use crate::memory::api::MemoryStore;
    use crate::memory::client::PluresDBClient;
    use crate::memory::migration;
    use chrono::Utc;
    use chrono::Duration as ChronoDuration;

    // Integration test: store events then query
    #[tokio::test]
    async fn test_store_and_query_events() {
        // This test requires a PluresDB server running
        // Skip if server is not available
        let client = match PluresDBClient::new("localhost", 34567, "./test-pluresdb-data") {
            Ok(c) => c,
            Err(_) => {
                eprintln!("Skipping test: PluresDB server not available");
                return;
            }
        };
        
        // Check if server is available
        if !client.health_check().await.unwrap_or(false) {
            eprintln!("Skipping test: PluresDB server not responding");
            return;
        }
        
        let store = MemoryStore::new(client).await.unwrap();
        
        // Create a test session
        let session = Session::new("bash".to_string(), "/tmp".to_string());
        let session_key = format!("memory:session:{}", session.id);
        store.client.put(&session_key, &serde_json::to_value(&session).unwrap()).await.unwrap();
        
        // Create a test command
        let mut command = Command::new(
            session.id.clone(),
            "echo".to_string(),
            vec!["hello".to_string()],
            "/tmp".to_string(),
        );
        command.exit_code = Some(0);
        command.success = true;
        command.ended_at = Some(Utc::now());
        command.duration_ms = Some(100);
        
        store.store_command(command.clone()).await.unwrap();
        
        // Create a test error
        let error = Error::new(
            command.id.clone(),
            session.id.clone(),
            "exit_code".to_string(),
            "low".to_string(),
            "Test error".to_string(),
        );
        store.store_error(error.clone()).await.unwrap();
        
        // Query recent errors
        let errors = store.query_recent_errors(Some(10), None, None).await.unwrap();
        assert!(errors.len() > 0);
        assert!(errors.iter().any(|e| e.id == error.id));
        
        // Get context window
        let context = store.get_context(&session.id, ChronoDuration::hours(1)).await.unwrap();
        assert_eq!(context.session_id, session.id);
        assert!(context.commands.len() > 0);
        assert!(context.errors.len() > 0);
        
        // List sessions
        let sessions = store.list_sessions().await.unwrap();
        assert!(sessions.iter().any(|s| s.id == session.id));
        
        // Cleanup
        store.wipe_all().await.unwrap();
    }

    // Property test: schema roundtrip
    #[tokio::test]
    async fn test_schema_roundtrip() {
        let client = match PluresDBClient::new("localhost", 34567, "./test-pluresdb-data") {
            Ok(c) => c,
            Err(_) => {
                eprintln!("Skipping test: PluresDB server not available");
                return;
            }
        };
        
        if !client.health_check().await.unwrap_or(false) {
            eprintln!("Skipping test: PluresDB server not responding");
            return;
        }
        
        let store = MemoryStore::new(client).await.unwrap();
        
        // Test Session roundtrip
        let session = Session::new("zsh".to_string(), "/home/user".to_string());
        let session_key = format!("memory:session:{}", session.id);
        store.client.put(&session_key, &serde_json::to_value(&session).unwrap()).await.unwrap();
        
        let retrieved_value = store.client.get(&session_key).await.unwrap().unwrap();
        let retrieved: Session = serde_json::from_value(retrieved_value).unwrap();
        assert_eq!(session.id, retrieved.id);
        assert_eq!(session.shell_type, retrieved.shell_type);
        assert_eq!(session.initial_cwd, retrieved.initial_cwd);
        
        // Test Command roundtrip
        let command = Command::new(
            session.id.clone(),
            "ls".to_string(),
            vec!["-la".to_string()],
            "/home/user".to_string(),
        );
        let command_key = format!("memory:command:{}", command.id);
        store.client.put(&command_key, &serde_json::to_value(&command).unwrap()).await.unwrap();
        
        let retrieved_value = store.client.get(&command_key).await.unwrap().unwrap();
        let retrieved: Command = serde_json::from_value(retrieved_value).unwrap();
        assert_eq!(command.id, retrieved.id);
        assert_eq!(command.command, retrieved.command);
        assert_eq!(command.args, retrieved.args);
        
        // Test Suggestion roundtrip
        let suggestion = Suggestion::new(
            "tip".to_string(),
            "medium".to_string(),
            0.8,
            "Test Tip".to_string(),
            "This is a test suggestion".to_string(),
        );
        store.persist_suggestion(suggestion.clone()).await.unwrap();
        
        let suggestions = store.get_suggestions(None, None).await.unwrap();
        assert!(suggestions.iter().any(|s| s.id == suggestion.id));
        
        // Cleanup
        store.wipe_all().await.unwrap();
    }

    // Test migration system
    #[tokio::test]
    async fn test_migrations() {
        let client = match PluresDBClient::new("localhost", 34567, "./test-pluresdb-data") {
            Ok(c) => c,
            Err(_) => {
                eprintln!("Skipping test: PluresDB server not available");
                return;
            }
        };
        
        if !client.health_check().await.unwrap_or(false) {
            eprintln!("Skipping test: PluresDB server not responding");
            return;
        }
        
        let store = MemoryStore::new(client).await.unwrap();
        
        // Run migrations
        migration::run_migrations(&store).await.unwrap();
        
        // Check migration status
        let status = migration::get_migration_status(&store).await.unwrap();
        assert!(status.is_up_to_date);
        assert_eq!(status.target_version, status.current_version);
        
        // Cleanup
        store.wipe_all().await.unwrap();
    }
}

