# RuneBook Cognitive Memory

Local-first "cognitive memory" storage for terminal events, commands, outputs, errors, insights, and suggestions.

## Overview

The cognitive memory system provides persistent storage for terminal activity, enabling pattern analysis, error tracking, and intelligent suggestions. It uses PluresDB as the storage backend with a Rust API layer for performance and type safety.

## Architecture

### Storage Schema

The memory system organizes data into the following collections:

- **sessions**: Terminal session metadata (start time, shell type, working directory)
- **commands**: Normalized command records (command, args, exit code, duration)
- **outputs**: Chunked stdout/stderr output (optionally compressed)
- **errors**: Classified error records (type, severity, context)
- **insights**: AI/heuristic annotations (patterns, optimizations, warnings)
- **suggestions**: Ranked suggestions (command, optimization, shortcut, warning, tip)
- **provenance**: Source tracking (confidence, model/tool used)

### Data Flow

```
Terminal Event → MemoryEvent → append_event() → PluresDB
                                    ↓
                            Schema-specific storage
                                    ↓
                    (sessions, commands, outputs, errors, etc.)
```

## API Reference

### Rust API

The main API is provided by the `MemoryStore` struct:

```rust
use runebook_lib::memory::*;

// Initialize
let store = init_memory_store("localhost", 34567, "./pluresdb-data").await?;

// Append event
let event = MemoryEvent { /* ... */ };
store.append_event(event).await?;

// List sessions
let sessions = store.list_sessions().await?;

// Query recent errors
let errors = store.query_recent_errors(Some(10), None, None).await?;

// Get context window
let context = store.get_context(&session_id, ChronoDuration::hours(1)).await?;

// Persist suggestion
store.persist_suggestion(suggestion).await?;
```

### CLI Commands

```bash
# Inspect memory storage
runebook memory inspect
```

## Memory Model

### Sessions

A session represents a terminal session with:
- Unique session ID
- Start/end timestamps
- Shell type (bash, zsh, nushell, etc.)
- Initial working directory
- Hostname and user (optional)

### Commands

Commands are normalized and stored with:
- Command name (normalized, e.g., "git" not "/usr/bin/git")
- Arguments array
- Environment summary (sanitized)
- Working directory
- Start/end timestamps
- Exit code and success status
- Duration in milliseconds
- Process ID (if available)

### Outputs

Output chunks are stored separately to enable:
- Streaming output handling
- Optional compression (gzip)
- Efficient retrieval of large outputs
- Chunk indexing for reconstruction

### Errors

Errors are classified by:
- Type (exit_code, stderr, timeout, permission, etc.)
- Severity (low, medium, high, critical)
- Message and context
- Associated command and session

### Insights

Insights are AI/heuristic annotations with:
- Type (pattern, optimization, warning, tip, correlation)
- Confidence score (0.0 to 1.0)
- Source (heuristic, ai, rule, etc.)
- Optional links to commands or sessions

### Suggestions

Suggestions are ranked recommendations with:
- Type (command, optimization, shortcut, warning, tip)
- Priority (low, medium, high)
- Rank score (higher = more relevant)
- Dismissed/applied status

### Provenance

Provenance tracks the source of data:
- Entity type and ID
- Source (terminal, ai, heuristic, user, etc.)
- Confidence score (if applicable)
- Model/tool name (if applicable)

## Retention Policy

By default, memory data is retained indefinitely. You can configure retention policies:

- **Max events**: Limit total number of events stored
- **Retention days**: Automatically delete data older than N days
- **Manual cleanup**: Use `wipe_all()` for testing/cleanup

### Wiping Memory

To completely wipe all memory data (useful for testing or privacy):

```rust
store.wipe_all().await?;
```

**Warning**: This permanently deletes all stored data. Use with caution.

## Encryption

The memory system provides encryption hooks for sensitive data:

- **No-op encryption**: Default (no encryption)
- **AES-256-GCM**: Application-level encryption (TODO)
- **PluresDB native**: If PluresDB supports encryption (TODO)

Encryption is optional and can be configured per deployment.

## Migration and Versioning

The schema includes a migration system for schema evolution:

- Current schema version: 1
- Automatic migration on initialization
- Version tracking in PluresDB

To add a new migration:

1. Increment `CURRENT_SCHEMA_VERSION` in `migration.rs`
2. Add migration logic in `migrate_to_version()`
3. Test migration with existing data

## Performance Considerations

- **Streaming output**: Outputs are chunked to handle large streams
- **Compression**: Optional gzip compression for outputs
- **Indexing**: Key prefixes enable efficient queries
- **Async operations**: All operations are async for non-blocking I/O

## Testing

### Integration Tests

Tests require a running PluresDB server:

```bash
# Start PluresDB server
pluresdb --port 34567 --data-dir ./test-pluresdb-data

# Run tests
cargo test --package runebook
```

### Property Tests

Schema roundtrip tests verify data integrity:

- Session roundtrip
- Command roundtrip
- Suggestion roundtrip

## Configuration

### PluresDB Connection

Default configuration:
- Host: `localhost`
- Port: `34567`
- Data directory: `./pluresdb-data`

### Environment Variables

- `PLURESDB_HOST`: Override host
- `PLURESDB_PORT`: Override port
- `PLURESDB_DATA_DIR`: Override data directory

## Troubleshooting

### PluresDB Not Available

If you see "PluresDB server not available":

1. Check if PluresDB is running: `curl http://localhost:34567/health`
2. Start PluresDB: `pluresdb --port 34567`
3. Check firewall/network settings

### Migration Errors

If migrations fail:

1. Check PluresDB logs
2. Verify schema version: `memory:schema:version` key
3. Manually run migrations if needed

### Performance Issues

For large datasets:

1. Enable output compression
2. Implement retention policies
3. Consider archiving old data

## Future Enhancements

- [ ] Full encryption implementation (AES-256-GCM)
- [ ] PluresDB native encryption integration
- [ ] Advanced querying (time ranges, filters)
- [ ] Data export/import
- [ ] Backup and restore
- [ ] Cross-session pattern analysis
- [ ] Real-time event streaming

