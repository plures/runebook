# RuneBook Architecture

This document describes the technical architecture of RuneBook, a reactive canvas-based computing environment.

## Overview

RuneBook is built as a desktop application using:
- **Frontend**: Svelte 5 + SvelteKit for the UI
- **Backend**: Tauri (Rust) for native system access
- **Data Flow**: Reactive stores with automatic propagation
- **Serialization**: YAML for human-readable persistence
- **Ambient Agent**: Optional intelligent command analysis and suggestions

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    RuneBook Desktop App                  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐   │
│  │            Frontend (Svelte 5)                    │   │
│  │                                                    │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐       │   │
│  │  │ Canvas   │  │ Toolbar  │  │  Nodes   │       │   │
│  │  │Component │  │Component │  │Components│       │   │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘       │   │
│  │       │             │             │              │   │
│  │       └─────────────┴─────────────┘              │   │
│  │                     │                            │   │
│  │              ┌──────▼──────┐                     │   │
│  │              │Svelte Stores│                     │   │
│  │              │(canvasStore,│                     │   │
│  │              │ nodeData)   │                     │   │
│  │              └──────┬──────┘                     │   │
│  │                     │                            │   │
│  │              ┌──────▼──────┐                     │   │
│  │              │   Tauri     │                     │   │
│  │              │   invoke()  │                     │   │
│  │              └──────┬──────┘                     │   │
│  └─────────────────────┼──────────────────────────┘   │
│                        │                               │
│  ┌─────────────────────▼──────────────────────────┐   │
│  │          Backend (Rust + Tauri)                 │   │
│  │                                                  │   │
│  │  ┌──────────────────────────────────────────┐  │   │
│  │  │     Tauri Command Handlers               │  │   │
│  │  │  - execute_terminal_command()            │  │   │
│  │  │  - (future: file operations, DB, etc.)   │  │   │
│  │  └────────────┬─────────────────────────────┘  │   │
│  │               │                                 │   │
│  │  ┌────────────▼─────────────────────────────┐  │   │
│  │  │      System Integration                   │  │   │
│  │  │  - Process execution (std::process)      │  │   │
│  │  │  - File system access                    │  │   │
│  │  │  - (future: DB, network, IPC)            │  │   │
│  │  └──────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────┘   │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Components

#### Canvas Component
- Manages the infinite canvas workspace
- Renders nodes and connections
- Handles drag-and-drop for nodes
- Delegates to specific node components

#### Node Components
Each node type has its own component:
- **TerminalNode**: Executes commands, shows output
- **InputNode**: Provides user input widgets
- **DisplayNode**: Shows data from other nodes

#### Toolbar Component
- Provides UI for adding nodes
- Canvas management (load, save, clear)
- Future: Node palette, search, filters

### State Management

RuneBook uses **Praxis** reactive logic engine for state management, providing:
- Type-safe event-driven architecture
- Declarative rules for state updates
- Built-in reactivity with Svelte 5 integration
- Improved testability and maintainability

#### Canvas Context
```typescript
CanvasContext = {
  canvas: {
    id: string,
    name: string,
    nodes: CanvasNode[],
    connections: Connection[]
  },
  nodeData: {
    [nodeId:portId]: any  // Data at each output port
  }
}
```

#### Events
State changes are driven by typed events:
- `AddNodeEvent`, `RemoveNodeEvent`
- `UpdateNodeEvent`, `UpdateNodePositionEvent`
- `AddConnectionEvent`, `RemoveConnectionEvent`
- `LoadCanvasEvent`, `ClearCanvasEvent`
- `UpdateNodeDataEvent`

#### Rules
Each event is processed by a corresponding rule that updates the context:
```typescript
const addNodeRule = defineRule<CanvasContext>({
  id: 'canvas.addNode',
  description: 'Add a new node to the canvas',
  impl: (state, events) => {
    const evt = events.find(AddNodeEvent.is);
    if (!evt) return [];
    state.context.canvas.nodes.push(evt.payload.node);
    return [];
  },
});
```

#### Store API
The Praxis engine is wrapped in a Svelte store for backward compatibility:
```typescript
canvasStore.subscribe((canvas) => { /* react to changes */ })
canvasStore.addNode(node)  // Dispatches AddNodeEvent
canvasStore.updateNodePosition(id, x, y)  // Dispatches UpdateNodePositionEvent
```

Stores runtime data from node outputs. When a node produces output, it's stored here and flows to connected inputs.

### Data Flow

```
User Action → Node Component → Store Update → Reactive Update → UI Update
                    ↓
            Tauri Command → Rust Backend → System → Result
                    ↓
            Store Update → Connected Nodes → Display Update
```

Example flow for terminal execution:
1. User clicks "Run" on TerminalNode
2. Component calls `invoke('execute_terminal_command', ...)`
3. Rust backend executes command via `std::process::Command`
4. Result returns to frontend
5. Component dispatches `UpdateNodeDataEvent` to Praxis engine
6. Praxis rule updates nodeData in context
7. Display nodes connected to this terminal reactively update via Svelte stores

## Reactive System

RuneBook combines Praxis reactive engine with Svelte 5's runes for reactivity:

```typescript
// Praxis event-driven state
import { AddNodeEvent } from '../stores/canvas-praxis';
canvasStore.addNode(newNode);  // Internally dispatches AddNodeEvent

// Svelte 5 runes for UI reactivity
let output = $state<string[]>([]);
const canvasData = $derived($canvasStore);

// Effects (side effects)
$effect(() => {
  const inputData = getNodeInputData(...);
  if (inputData !== undefined) {
    content = inputData;
  }
});
```

When Praxis engine processes events:
1. Events are dispatched to the engine (e.g., `AddNodeEvent.create(...)`)
2. Praxis rules match events and update the context
3. Svelte store wrapper detects context changes
4. Components with `$derived` or subscriptions automatically re-render
5. UI updates reflect the new state
4. UI re-renders with new data

## Backend Architecture

### Tauri Commands

Commands are Rust functions exposed to the frontend:

```rust
#[tauri::command]
async fn execute_terminal_command(
    command: String,
    args: Vec<String>,
    env: HashMap<String, String>,
    cwd: String,
) -> Result<String, String> {
    // Implementation
}
```

### Process Execution

Terminal commands use Rust's `std::process::Command`:
- Spawn subprocess
- Capture stdout/stderr
- Return results to frontend
- Handle errors gracefully

## Serialization

### YAML Format

Canvases are saved as YAML for human readability:

```yaml
id: canvas-id
name: Canvas Name
nodes:
  - id: node-1
    type: terminal
    position: { x: 100, y: 100 }
    command: echo
    args: ["Hello"]
connections:
  - from: node-1
    to: node-2
    fromPort: stdout
    toPort: input
```

Benefits:
- Human-readable and editable
- Git-friendly (text-based)
- Easy to version control
- Supports comments

## Security Considerations

### Command Execution
- All commands run with user permissions
- No privilege escalation
- Input validation on command parameters
- Environment variable sanitization

### File Access
- Limited to user's accessible directories
- No automatic file system traversal
- Future: Configurable permissions

### Future Security
- Sandboxing for untrusted canvases
- Permission system for sensitive operations
- Audit logging for security events

## Performance Considerations

### Canvas Rendering
- SVG for connections (scalable, crisp)
- Virtual scrolling for large canvases (future)
- Debounced drag operations
- Efficient re-rendering via Svelte

### Data Flow
- Minimal store updates (only changed data)
- Selective reactive updates
- Lazy evaluation where possible

### Process Management
- Async command execution
- Non-blocking UI during operations
- Process cleanup on node removal (future)

## Extensibility

### Plugin System (Future)
```typescript
interface NodePlugin {
  type: string;
  component: SvelteComponent;
  execute?: (config: any) => Promise<any>;
}
```

### Custom Commands (Future)
- User-defined Tauri commands
- Dynamic command loading
- Sandboxed execution environment

## Testing Strategy

### Current State
- Manual testing via UI
- Build verification (TypeScript check, Vite build)

### Future Testing
- Unit tests for utilities and stores
- Component tests for Svelte components
- Integration tests for Tauri commands
- End-to-end tests for workflows

## Deployment

### Build Process
```bash
npm run build           # Build frontend
npm run tauri build     # Build desktop app
```

Produces:
- `.deb` for Linux
- `.dmg` for macOS
- `.exe` for Windows

### Distribution
- GitHub Releases
- Future: Auto-updates via Tauri updater
- Future: Package managers (Homebrew, apt, etc.)

## Ambient Agent Mode Architecture

Ambient Agent Mode provides intelligent command analysis and suggestions through a clean separation of concerns:

### Architecture Layers

```
┌─────────────────────────────────────────────────────────┐
│              Terminal Command Execution                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Event Capture Layer                           │
│  - Command interception                                 │
│  - Context tracking (cwd, env, session)                 │
│  - Result capture (stdout, stderr, exit code)           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Storage/Memory Layer                          │
│  - In-memory storage (default)                          │
│  - PluresDB storage (optional, persistent)             │
│  - Event persistence and querying                        │
│  - Pattern storage                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Analysis Engine                               │
│  - Pattern detection (frequent commands)                │
│  - Failure analysis (repeated failures)                 │
│  - Performance analysis (slow commands)                 │
│  - Suggestion generation                                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Suggestion System                             │
│  - Suggestion types (command, optimization, warning)    │
│  - Priority levels (low, medium, high)                  │
│  - CLI formatting                                        │
│  - UI-ready format (future)                              │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌────────────┴────────────┐
         ▼                           ▼
┌──────────────┐          ┌──────────────┐
│  Headless    │          │  GUI (future) │
│  CLI         │          │  Display      │
└──────────────┘          └──────────────┘
```

### Component Details

#### Event Capture (`src/lib/agent/capture.ts`)
- Intercepts terminal commands before execution
- Tracks command metadata (args, env, cwd)
- Captures results (stdout, stderr, exit code, duration)
- Maintains session context

#### Storage Layer (`src/lib/agent/memory.ts`)
- **MemoryStorage**: In-memory storage for testing and headless mode
- **PluresDBStorage**: Persistent storage using PluresDB
- Event querying (by command, time range, limit)
- Pattern storage and retrieval
- Statistics calculation

#### Analysis Engine (`src/lib/agent/analysis.ts`)
- **DefaultAnalyzer**: Rule-based pattern analysis
- Detects repeated failures
- Identifies slow commands
- Suggests shortcuts for frequent commands
- Generates optimization recommendations

#### Suggestion System (`src/lib/agent/suggestions.ts`)
- Stores and manages suggestions
- Formats suggestions for CLI output
- Supports priority filtering
- Ready for UI integration

#### Integration Layer (`src/lib/agent/integration.ts`)
- Connects agent to terminal execution
- Provides simple API for enabling/disabling
- Handles automatic event capture

#### Headless CLI (`src/cli/index.ts`)
- SSH-friendly interface
- Agent management commands
- Status and statistics display
- Event history viewing
- Configuration management

### Data Flow Example

1. User executes command in TerminalNode
2. `TerminalNode.svelte` calls `captureCommandStart()`
3. Event is captured with metadata
4. Command executes via Tauri backend
5. Result is captured via `captureCommandResult()`
6. Event is saved to storage
7. Analysis engine processes event
8. Suggestions are generated and stored
9. User can view suggestions via CLI: `npm run agent suggestions`

### Configuration

Agent configuration is stored in `~/.runebook/agent-config.json`:

```json
{
  "enabled": true,
  "captureEvents": true,
  "analyzePatterns": true,
  "suggestImprovements": true,
  "storagePath": "./pluresdb-data",
  "maxEvents": 10000,
  "retentionDays": 30
}
```

### Security & Privacy

- **Opt-in by default**: Agent is disabled until explicitly enabled
- **Local-only storage**: All data stored locally, no external services
- **No background daemon**: Runs only when explicitly enabled
- **Configurable retention**: Automatic cleanup of old events
- **Clear data policy**: User controls what is stored and for how long

## Event Capture System

### Terminal Observer Layer

RuneBook includes a low-level terminal observer system for capturing shell events in real-time. This system operates independently of the GUI and can work in headless mode.

#### Architecture

```
Shell (bash/zsh) → Shell Adapter → Event Store → Analysis/Query
                      ↓
                 Redaction Layer
```

#### Event Schema

The observer captures a canonical set of event types defined in `src/lib/core/types.ts`:

**Base Event Structure:**
All events extend `BaseTerminalEvent`:
```typescript
interface BaseTerminalEvent {
  id: string;                    // Unique event ID
  type: EventType;                // Event type
  timestamp: number;              // Unix timestamp (ms)
  sessionId: string;              // Session identifier
  shellType: ShellType;           // 'bash' | 'zsh' | 'nushell' | 'unknown'
  paneId?: string;                // Terminal pane/tab identifier (optional)
  tabId?: string;                 // Terminal tab identifier (optional)
}
```

**Event Types:**

1. **command_start**: Command begins execution
   ```typescript
   interface CommandStartEvent extends BaseTerminalEvent {
     type: 'command_start';
     command: string;              // Command name (normalized)
     args: string[];               // Command arguments
     cwd: string;                  // Working directory
     envSummary: Record<string, string>; // Sanitized environment variables
     pid?: number;                 // Process ID (if available)
   }
   ```

2. **command_end**: Command completes
   ```typescript
   interface CommandEndEvent extends BaseTerminalEvent {
     type: 'command_end';
     commandId: string;            // Reference to command_start event
     duration: number;             // Execution duration (milliseconds)
   }
   ```

3. **stdout_chunk**: Incremental stdout output
   ```typescript
   interface StdoutChunkEvent extends BaseTerminalEvent {
     type: 'stdout_chunk';
     commandId: string;            // Reference to command_start event
     chunk: string;                // Output chunk content
     chunkIndex: number;           // Sequential chunk number
   }
   ```

4. **stderr_chunk**: Incremental stderr output
   ```typescript
   interface StderrChunkEvent extends BaseTerminalEvent {
     type: 'stderr_chunk';
     commandId: string;            // Reference to command_start event
     chunk: string;                // Error output chunk
     chunkIndex: number;           // Sequential chunk number
   }
   ```

5. **exit_status**: Command exit code
   ```typescript
   interface ExitStatusEvent extends BaseTerminalEvent {
     type: 'exit_status';
     commandId: string;            // Reference to command_start event
     exitCode: number;             // Exit code (0 = success)
     success: boolean;             // true if exitCode === 0
   }
   ```

6. **cwd_change**: Working directory changed
   ```typescript
   interface CwdChangeEvent extends BaseTerminalEvent {
     type: 'cwd_change';
     cwd: string;                  // New working directory
     previousCwd?: string;         // Previous working directory
   }
   ```

7. **env_change**: Environment variables changed
   ```typescript
   interface EnvChangeEvent extends BaseTerminalEvent {
     type: 'env_change';
     envSummary: Record<string, string>; // Sanitized environment variables
     changedKeys: string[];        // Keys that were added/modified
   }
   ```

8. **session_start**: Terminal session started
   ```typescript
   interface SessionStartEvent extends BaseTerminalEvent {
     type: 'session_start';
     shellType: ShellType;
     cwd: string;
     envSummary: Record<string, string>;
   }
   ```

9. **session_end**: Terminal session ended
   ```typescript
   interface SessionEndEvent extends BaseTerminalEvent {
     type: 'session_end';
     duration: number;             // Session duration (milliseconds)
   }
   ```

**Union Type:**
```typescript
type TerminalObserverEvent =
  | CommandStartEvent
  | CommandEndEvent
  | StdoutChunkEvent
  | StderrChunkEvent
  | ExitStatusEvent
  | CwdChangeEvent
  | EnvChangeEvent
  | SessionStartEvent
  | SessionEndEvent;
```

#### Shell Adapters

Shell adapters provide hooks for capturing events:

- **Bash Adapter**: Uses DEBUG trap and ERR trap for command capture
- **Zsh Adapter**: Uses preexec_functions and precmd_functions hooks
- **Nushell Adapter**: (Planned for future)

Adapters can work in two modes:
1. **Shell Hook Mode**: Integrates into shell init files (`.bashrc`, `.zshrc`)
2. **Programmatic Mode**: Captures commands executed via Node.js API

#### Secret Redaction

The observer includes automatic secret redaction:

- **Environment Variables**: Detects and redacts token-like env vars (API_KEY, TOKEN, SECRET, etc.)
- **Output Redaction**: Scans stdout/stderr for common secret patterns
- **Custom Patterns**: Supports user-defined redaction patterns
- **Partial Reveal**: For long secrets, shows first 4 and last 4 characters

#### Storage

Events are stored using a pluggable storage layer:

- **LocalFileStore**: In-memory or file-based storage (default)
- **PluresDBEventStore**: Persistent storage using PluresDB (optional)

Storage supports:
- Event persistence
- Query by type, time range, command, session
- Statistics calculation
- Event retention and cleanup

#### Configuration

Observer is opt-in by default:

```typescript
{
  enabled: false,           // Must be explicitly enabled
  redactSecrets: true,     // Enable secret redaction
  usePluresDB: false,      // Use PluresDB or local storage
  chunkSize: 4096,         // Max chunk size for stdout/stderr
  maxEvents: 10000,        // Maximum events to store
  retentionDays: 30,       // Days to retain events
  shellType: 'auto-detect' // Shell type (bash/zsh/nushell)
}
```

#### CLI Interface

The observer provides a headless CLI interface:

```bash
# Enable observer
runebook observer enable

# Show status
runebook observer status

# Tail events in real-time
runebook observer events tail

# Show recent events
runebook observer events 20
```

#### Headless Operation

The observer is designed to work without GUI:
- No Tauri dependencies
- Pure Node.js implementation
- SSH-friendly interface
- Can run as background service

#### Integration Points

The observer can be integrated at multiple levels:

1. **Shell Level**: Via shell hooks (`.bashrc`, `.zshrc`)
2. **Application Level**: Via programmatic API in Node.js
3. **Terminal Node**: Integrated with RuneBook TerminalNode component

## Memory Schema (Cognitive Memory Storage)

The cognitive memory system provides persistent storage for terminal activity, enabling pattern analysis, error tracking, and intelligent suggestions. It uses PluresDB as the storage backend with a Rust API layer.

### Storage Schema

The memory system organizes data into the following collections (defined in `src-tauri/src/memory/schema.rs`):

#### Sessions

Represents a terminal session:

```rust
pub struct Session {
    pub id: String,                    // Unique session ID
    pub started_at: DateTime<Utc>,    // Session start time
    pub ended_at: Option<DateTime<Utc>>, // Session end time (if ended)
    pub shell_type: String,            // bash, zsh, nushell, etc.
    pub initial_cwd: String,           // Initial working directory
    pub hostname: Option<String>,      // Hostname (optional)
    pub user: Option<String>,          // Username (optional)
    pub metadata: serde_json::Value,    // Additional metadata
}
```

**Storage Key**: `memory:session:{session_id}`

#### Commands

Normalized command records:

```rust
pub struct Command {
    pub id: String,                    // Unique command ID
    pub session_id: String,             // Associated session
    pub command: String,                // Normalized command (e.g., "git" not "/usr/bin/git")
    pub args: Vec<String>,              // Command arguments
    pub env_summary: serde_json::Value, // Sanitized environment variables
    pub cwd: String,                   // Working directory
    pub started_at: DateTime<Utc>,     // Command start time
    pub ended_at: Option<DateTime<Utc>>, // Command end time
    pub exit_code: Option<i32>,        // Exit code
    pub success: bool,                 // true if exit_code == 0
    pub duration_ms: Option<u64>,      // Execution duration (ms)
    pub pid: Option<u32>,              // Process ID (if available)
}
```

**Storage Key**: `memory:command:{command_id}`

#### Outputs

Chunked stdout/stderr output (optionally compressed):

```rust
pub struct Output {
    pub id: String,                    // Unique output ID
    pub command_id: String,             // Associated command
    pub stream_type: String,            // "stdout" or "stderr"
    pub chunk_index: u32,               // Sequential chunk number
    pub content: Vec<u8>,               // Raw bytes (may be compressed)
    pub compressed: bool,              // Whether content is gzip-compressed
    pub size_bytes: u64,                // Uncompressed size
    pub timestamp: DateTime<Utc>,      // Timestamp
}
```

**Storage Key**: `memory:output:{command_id}:{stream_type}:{chunk_index}`

#### Errors

Classified error records:

```rust
pub struct Error {
    pub id: String,                    // Unique error ID
    pub command_id: String,             // Associated command
    pub session_id: String,              // Associated session
    pub error_type: String,             // "exit_code", "stderr", "timeout", "permission", etc.
    pub severity: String,               // "low", "medium", "high", "critical"
    pub message: String,                // Error message
    pub stderr_snippet: Option<String>, // First 500 chars of stderr
    pub exit_code: Option<i32>,        // Exit code (if applicable)
    pub timestamp: DateTime<Utc>,       // Timestamp
    pub context: serde_json::Value,      // Additional error context
}
```

**Storage Key**: `memory:error:{error_id}`

#### Insights

AI/heuristic annotations:

```rust
pub struct Insight {
    pub id: String,                    // Unique insight ID
    pub command_id: Option<String>,      // Optional: linked to specific command
    pub session_id: Option<String>,   // Optional: linked to specific session
    pub insight_type: String,          // "pattern", "optimization", "warning", "tip", "correlation"
    pub title: String,                  // Insight title
    pub description: String,            // Insight description
    pub confidence: f64,                // 0.0 to 1.0
    pub source: String,                 // "heuristic", "ai", "rule", etc.
    pub generated_at: DateTime<Utc>,    // Generation timestamp
    pub metadata: serde_json::Value,    // Additional metadata
}
```

**Storage Key**: `memory:insight:{insight_id}`

#### Suggestions

Ranked suggestions:

```rust
pub struct Suggestion {
    pub id: String,                    // Unique suggestion ID
    pub suggestion_type: String,       // "command", "optimization", "shortcut", "warning", "tip"
    pub priority: String,               // "low", "medium", "high"
    pub rank: f64,                      // Ranking score (higher = more relevant)
    pub title: String,                  // Suggestion title
    pub description: String,            // Suggestion description
    pub command: Option<String>,        // Suggested command
    pub args: Option<Vec<String>>,       // Suggested arguments
    pub context: serde_json::Value,     // Additional context
    pub created_at: DateTime<Utc>,      // Creation timestamp
    pub dismissed: bool,                // Whether user dismissed
    pub applied: bool,                 // Whether user applied
}
```

**Storage Key**: `memory:suggestion:{suggestion_id}`

#### Provenance

Source tracking for all entities:

```rust
pub struct Provenance {
    pub id: String,                    // Unique provenance ID
    pub entity_type: String,           // "command", "output", "error", "insight", "suggestion"
    pub entity_id: String,              // ID of the entity
    pub source: String,                 // "terminal", "ai", "heuristic", "user", etc.
    pub confidence: Option<f64>,        // 0.0 to 1.0 (if applicable)
    pub model: Option<String>,          // AI model name (if applicable)
    pub tool: Option<String>,           // Tool/function name (if applicable)
    pub created_at: DateTime<Utc>,      // Creation timestamp
    pub metadata: serde_json::Value,   // Additional metadata
}
```

**Storage Key**: `memory:provenance:{entity_type}:{entity_id}`

### Data Flow

```
Terminal Event → MemoryEvent → append_event() → PluresDB
                                    ↓
                            Schema-specific storage
                                    ↓
                    (sessions, commands, outputs, errors, etc.)
```

### API Surface

The memory system provides a Rust API (`src-tauri/src/memory/api.rs`):

```rust
// Initialize memory store
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

### CLI Surface

```bash
# Inspect memory storage
npm run memory inspect
```

This displays:
- Recent sessions
- Recent errors
- Active suggestions (ranked by priority)

## Analysis Ladder

The Analysis Ladder is a multi-layer approach to analyzing command failures and generating actionable suggestions. See [ANALYSIS_LADDER.md](./ANALYSIS_LADDER.md) for full details.

### Architecture

Three layers executed in order:

1. **Layer 1: Heuristic Classifiers** (Fast, deterministic)
   - NixErrorAnalyzer: Nix-specific errors
   - GitAuthAnalyzer: Git/GitHub authentication issues
   - SyntaxErrorAnalyzer: Syntax and command errors
   - High confidence (0.7-0.95), fast execution (< 100ms)

2. **Layer 2: Local Search** (Context-aware)
   - LocalSearchAnalyzer: Repository file search
   - Medium confidence (0.6-0.8), moderate execution (100-500ms)

3. **Layer 3: Optional LLM/MCP** (Gated, disabled by default)
   - LLMAnalyzer: Placeholder for future integration
   - Variable confidence, slower execution (1-5s)

### Job System

- **Non-blocking**: Jobs run in background
- **Cancelable**: Jobs can be cancelled if pending
- **Context Windows**: Full command context (command, args, cwd, env, stdout, stderr, previous commands)

### Structured Suggestions

Each suggestion includes:
- Type: `command` | `optimization` | `shortcut` | `warning` | `tip`
- Priority: `low` | `medium` | `high`
- Confidence: 0.0 to 1.0
- Actionable snippet: Code/command to fix
- Provenance: Analyzer, layer, timestamp

## Security Model

### Data Privacy

- **Opt-in by default**: Agent disabled until explicitly enabled
- **Local-only storage**: All data stored locally, no external services
- **Secret redaction**: Automatic detection and redaction of:
  - Environment variables (API_KEY, TOKEN, SECRET, etc.)
  - Output patterns (common secret formats)
  - Custom patterns (user-defined)
- **Partial reveal**: For long secrets, shows first 4 and last 4 characters only

### Access Control

- **User permissions**: All commands run with same permissions as RuneBook application
- **No privilege escalation**: Commands cannot gain elevated privileges
- **Configurable retention**: Automatic cleanup of old events (default: 30 days)
- **Manual deletion**: User can clear events at any time

### Storage Security

- **Encryption hooks**: Framework for encryption (no-op by default)
- **Future**: AES-256-GCM encryption support
- **Future**: PluresDB native encryption integration

### Analysis Security

- **Never auto-execute**: Analysis only suggests, never executes commands
- **Deterministic first**: Layer 1 and 2 are rule-based (no external calls)
- **LLM gated**: Layer 3 disabled by default, requires explicit enable
- **Provenance tracking**: All suggestions track their source

### Configuration Security

- **Config file location**: `~/.runebook/agent-config.json`
- **Observer config**: `~/.runebook/observer-config.json`
- **No sensitive defaults**: All sensitive features opt-in
- **Clear data policy**: User controls what is stored and for how long

## Future Architecture

### PluresDB Integration
```
Frontend ↔ Tauri ↔ PluresDB (local)
                    ↕
               Sync Service (cloud)
```

### MCP Integration
```
Node → MCP Client → AI Model → Response → Node
```

### Sudolang Integration
```
Sudolang Script → Parser → Canvas Generator → Canvas
```

## Development Workflow

1. **Frontend changes**: Edit Svelte components, hot-reload in dev mode
2. **Backend changes**: Edit Rust code, Tauri auto-rebuilds
3. **Type checking**: `npm run check` before commit
4. **Build verification**: `npm run build` to ensure production builds
5. **Testing**: Manual testing + future automated tests

## Resources

- [Tauri Documentation](https://tauri.app/)
- [Svelte 5 Documentation](https://svelte.dev/)
- [SvelteKit Documentation](https://kit.svelte.dev/)
- [Rust Documentation](https://doc.rust-lang.org/)
