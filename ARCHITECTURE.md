# RuneBook Architecture

This document describes the technical architecture of RuneBook, a reactive canvas-based computing environment.

## Overview

RuneBook is built as a desktop application using:
- **Frontend**: Svelte 5 + SvelteKit for the UI
- **Backend**: Tauri (Rust) for native system access
- **Data Flow**: Reactive stores with automatic propagation
- **Serialization**: YAML for human-readable persistence

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

#### Canvas Store
```typescript
canvasStore = {
  id: string,
  name: string,
  nodes: CanvasNode[],
  connections: Connection[]
}
```

Provides methods:
- `addNode()`, `removeNode()`, `updateNode()`
- `addConnection()`, `removeConnection()`
- `loadCanvas()`, `clear()`

#### Node Data Store
```typescript
nodeDataStore = {
  [nodeId:portId]: any  // Data at each output port
}
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
5. Component updates `nodeDataStore` with output
6. Display nodes connected to this terminal reactively update

## Reactive System

RuneBook uses Svelte 5's runes for reactivity:

```typescript
// State
let output = $state<string[]>([]);

// Derived values
const canvasData = $derived($canvasStore);

// Effects (side effects)
$effect(() => {
  const inputData = getNodeInputData(...);
  if (inputData !== undefined) {
    content = inputData;
  }
});
```

When `nodeDataStore` updates:
1. Svelte detects the change
2. Components with `$effect` watching that data re-run
3. Display nodes update their content automatically
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
