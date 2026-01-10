# RuneBook

RuneBook is a reactive, canvas-native computing environment that merges terminals, notebooks, and web components. Built on Svelte 5, PluresDB, Tauri, and Sudolang, RuneBook lets users wire terminals, inputs, and UI components on a visual canvas to create programmable, AI-enhanced workflows that behave like reactive web apps.

## Features

- **Visual Canvas Interface**: Drag-and-drop nodes on an infinite canvas
- **Terminal Nodes**: Execute shell commands with reactive output
- **Input Widgets**: Text inputs, sliders, checkboxes, and number inputs
- **Transform Nodes**: Process data with map, filter, and reduce operations
- **Display Components**: Visualize data as text, JSON, tables, or charts
- **Reactive Data Flow**: Node outputs automatically flow to connected inputs
- **YAML Canvas Definitions**: Save and load canvas configurations
- **Ambient Agent Mode**: Intelligent command analysis and suggestions (opt-in)
- **Headless CLI**: SSH-friendly interface for agent management
- **Cross-Platform**: Built with Tauri for Windows, macOS, and Linux

See [CHANGELOG.md](./CHANGELOG.md) for version history and detailed feature information.

## Installation

### Download Pre-built Binaries

Download the latest release for your platform from [GitHub Releases](https://github.com/plures/runebook/releases):

- **macOS**: Download `.dmg` file (supports Intel and Apple Silicon)
- **Linux**: Download `.AppImage` or `.deb` file
- **Windows**: Download `.msi` or `.exe` installer

### Package Managers

**npm**:
```bash
npm install -g @plures/runebook
```

**GitHub Packages (npm)**:
```bash
npm config set @plures:registry https://npm.pkg.github.com
npm install -g @plures/runebook
```

**Windows (winget)**:
```powershell
winget install Plures.RuneBook
```

**NixOS / Nix Flakes**:
```bash
# Run directly from flake
nix run github:plures/runebook

# Or add to your flake inputs
# runebook.url = "github:plures/runebook";

# Build packages
nix build github:plures/runebook#runebook
nix build github:plures/runebook#runebook-agent
```

**Note**: A PR to add RuneBook to nixpkgs is in progress. Once merged, you'll be able to install via `nix-env` or NixOS configuration.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Rust 1.70 or higher
- Platform-specific dependencies:
  - **Linux**: webkit2gtk, rsvg2 (see [Tauri prerequisites](https://tauri.app/guides/prerequisites/#linux))
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft C++ Build Tools
  - **NixOS**: Use `nix-shell` or `nix develop` (see NixOS Support below)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/plures/runebook.git
   cd runebook
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run tauri dev
   ```

4. Build for production:
   ```bash
   npm run tauri build
   ```

### NixOS Support

RuneBook includes full NixOS support for reproducible development and deployment:

**Using Nix Flakes:**
```bash
nix develop  # Enter development shell
npm install
npm run dev
```

**Building packages:**
```bash
nix build .#runebook        # Build Tauri app
nix build .#runebook-agent  # Build headless agent CLI
```

**Running applications:**
```bash
nix run .#runebook                    # Run Tauri app
nix run .#runebook-agent -- agent status  # Run agent CLI
```

**NixOS Module:**
The flake includes a NixOS module for running `runebook-agent` as a systemd service. See [NIXOS.md](./NIXOS.md) for detailed configuration instructions.

The Nix environment includes all required dependencies (Node.js, Rust, system libraries, Tauri CLI).

For complete NixOS documentation, see [NIXOS.md](./NIXOS.md).

## Usage

### Creating Nodes

Use the toolbar on the left to add nodes to the canvas:

- **⚡ Terminal**: Execute shell commands
- **📝 Input**: Create user input widgets
- **🔄 Transform**: Process and transform data
- **📊 Display**: Show data and outputs

### Terminal Nodes

Terminal nodes execute shell commands and expose their stdout as reactive outputs:

- Set the command and arguments
- Click "Run" to execute
- Output automatically flows to connected display nodes

### Input Nodes

Input nodes provide interactive controls:

- **Text**: String input
- **Number**: Numeric input with min/max/step
- **Checkbox**: Boolean toggle
- **Slider**: Range selector

### Transform Nodes

Transform nodes process data between other nodes:

- **Map**: Transform each item in an array (e.g., `item * 2`)
- **Filter**: Select items matching criteria (e.g., `item > 10`)
- **Reduce**: Aggregate data into a single value (e.g., `acc + item`)
- **Sudolang**: Natural language transformations (planned)

Connect input data, write JavaScript expressions, and output flows automatically.

**Security Note**: Transform nodes execute user-provided JavaScript code locally. Only use transform nodes with code you trust. This feature is designed for personal use and local workflows.

### Display Nodes

Display nodes visualize data from connected nodes:

- **Text**: Plain text display
- **JSON**: Formatted JSON viewer
- **Table**: Tabular data display

### Connecting Nodes

To connect nodes:

1. Click and drag from an output port (right side of a node)
2. Drop on an input port (left side of another node)
3. Data will flow automatically from output to input

### Loading Examples

Click "📂 Load Example" in the toolbar to load pre-built canvas examples:

- `hello-world.yaml`: Simple echo command and input demonstration
- `date-time-example.yaml`: Multiple terminals showing date, time, and file listings

### Saving Canvases

RuneBook provides two storage options and YAML export:

1. **Browser Storage** (💾): Quick save to browser's localStorage (default)
2. **PluresDB Storage** (💾): P2P-enabled persistent storage with cross-device sync
3. **Export YAML** (📥): Download canvas as a YAML file

To save to storage:
- Click "💾 Save to Storage" in the toolbar
- Your canvas is saved and can be accessed from "📚 Saved Canvases"

To switch storage type:
- Click "⚙️ Storage Settings" in the toolbar
- Choose between "Browser Storage" or "PluresDB (P2P)"
- PluresDB requires PluresDB server running (see [PluresDB documentation](https://github.com/plures/pluresdb))

To export as YAML:
- Click "📥 Export YAML" to download the canvas as a file
- The file contains node definitions, connections, and canvas metadata

### Loading Canvases

Load previously saved canvases:
- Click "📚 Saved Canvases" to view your saved work
- Click on any canvas name to load it
- Or click "📂 Load Example" to try pre-built demos

### Ambient Agent Mode

RuneBook includes an optional **Ambient Agent Mode** that analyzes your terminal commands and provides intelligent suggestions. This feature runs in the background, learns from your command patterns, and offers actionable recommendations to improve your workflow.

#### What is Ambient Agent Mode?

Ambient Agent Mode is an intelligent assistant that:
- **Captures** terminal commands and their outcomes automatically
- **Analyzes** patterns in your command usage (frequency, success rates, performance)
- **Suggests** optimizations, shortcuts, and warnings based on detected patterns
- **Learns** from failures and provides context-aware remediation suggestions
- **Operates** entirely locally—no data leaves your machine

The agent uses a multi-layer analysis ladder (see [ANALYSIS_LADDER.md](./ANALYSIS_LADDER.md)):
1. **Layer 1**: Fast heuristic classifiers for common errors (Nix, Git, syntax errors)
2. **Layer 2**: Local search through repository files for context
3. **Layer 3**: Optional LLM/MCP integration (disabled by default)

#### How to Enable

**Option 1: Via CLI (Headless Mode - Recommended for SSH)**

```bash
# Enable the agent
npm run agent enable

# Check status
npm run agent status

# View suggestions
npm run agent suggestions

# View recent events
npm run agent events 20

# Analyze last failure
npm run analyze last
```

**Option 2: Via Code (In Application)**

```typescript
import { initAgent } from './lib/agent/integration';

initAgent({
  enabled: true,
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
});
```

**Option 3: Via Observer (Terminal Observer Layer)**

```bash
# Enable terminal observer (captures all shell commands)
npm run observer enable

# Tail events in real-time
npm run observer events tail

# View recent events
npm run observer events 20
```

#### What Data is Stored?

The agent stores the following data locally:

**Event Data:**
- Command name and arguments
- Working directory
- Environment variables (sanitized, secrets redacted)
- Command output (stdout/stderr)
- Exit codes and execution duration
- Timestamps and session IDs

**Analysis Data:**
- Command patterns (frequency, success rates)
- Error classifications
- Performance metrics
- Generated suggestions with confidence scores

**Storage Locations:**
- **In-memory**: Default for testing (data lost on restart)
- **PluresDB**: Persistent storage (requires PluresDB server)
- **Local files**: Configuration in `~/.runebook/agent-config.json`

**Privacy & Security:**
- All data stored locally—never sent to external services
- Secrets automatically redacted (API keys, tokens, passwords)
- Opt-in by default (disabled until explicitly enabled)
- Configurable retention period (default: 30 days)

#### How to Inspect Data

**View Agent Status:**
```bash
npm run agent status
```

**View Recent Events:**
```bash
npm run agent events 20  # Show last 20 events
```

**View Suggestions:**
```bash
npm run agent suggestions        # All suggestions
npm run agent suggestions high   # High priority only
```

**Inspect Cognitive Memory (PluresDB):**
```bash
npm run memory inspect
```

This shows:
- Recent sessions
- Recent errors
- Active suggestions (ranked by priority)

**View Analysis Results:**
```bash
npm run analyze last  # Analyze the last command failure
```

**Tail Events in Real-Time:**
```bash
npm run observer events tail
```

#### How to Delete Data

**Clear Old Events:**
```bash
# Clear events older than 30 days (default)
npm run agent clear

# Clear events older than 7 days
npm run agent clear 7
```

**Clear Observer Events:**
```typescript
// Via code
const observer = createObserver(config);
await observer.clearEvents(days);
```

**Wipe All Memory (PluresDB):**
```rust
// Via Rust API (in development)
store.wipe_all().await?;
```

**Manual Cleanup:**
- Configuration: `~/.runebook/agent-config.json`
- Observer config: `~/.runebook/observer-config.json`
- PluresDB data: `./pluresdb-data` (or configured path)

#### Running Headless

Ambient Agent Mode is designed to work without the GUI, making it perfect for SSH sessions and server environments.

**Basic Usage:**
```bash
# Enable and check status
npm run agent enable
npm run agent status

# Run some commands (they'll be captured)
nix build
git push

# View suggestions
npm run agent suggestions

# Analyze failures
npm run analyze last
```

**Observer Mode (Captures All Shell Commands):**
```bash
# Enable observer
npm run observer enable

# Tail events as they happen
npm run observer events tail

# View recent events
npm run observer events 50
```

**Full CLI Reference:**
```bash
# Agent commands
npm run agent enable|disable|status|suggestions|events|clear

# Observer commands  
npm run observer enable|disable|status|events

# Analysis commands
npm run analyze last

# Memory commands
npm run memory inspect
```

#### CLI Commands Reference

**Agent Commands:**
- `npm run agent enable` - Enable the agent
- `npm run agent disable` - Disable the agent
- `npm run agent status` - Show agent status and statistics
- `npm run agent suggestions [priority]` - View suggestions (optional: low/medium/high)
- `npm run agent events [limit]` - View recent command events (default: 10)
- `npm run agent clear [days]` - Clear events older than N days (default: 30)
- `npm run agent config <key> <value>` - Set configuration option

**Observer Commands:**
- `npm run observer enable` - Enable terminal observer
- `npm run observer disable` - Disable terminal observer
- `npm run observer status` - Show observer status and statistics
- `npm run observer events [limit]` - Show recent events (default: 10)
- `npm run observer events tail` - Tail events in real-time

**Analysis Commands:**
- `npm run analyze last` - Analyze the last command failure

**Memory Commands:**
- `npm run memory inspect` - Inspect cognitive memory storage (PluresDB)

#### Troubleshooting

**Agent not capturing events:**
1. Check if agent is enabled: `npm run agent status`
2. Verify configuration: `cat ~/.runebook/agent-config.json`
3. Ensure `captureEvents: true` in config

**PluresDB not available:**
1. Check if PluresDB is running: `curl http://localhost:34567/health`
2. Start PluresDB: `pluresdb --port 34567`
3. Use in-memory storage: Set `usePluresDB: false` in config

**No suggestions appearing:**
1. Run some commands first (agent needs data to analyze)
2. Check for failures: `npm run agent events 20`
3. Run analysis: `npm run analyze last`

**Observer not working:**
1. Check if observer is enabled: `npm run observer status`
2. Verify shell hooks are installed (bash/zsh adapters)
3. Check observer config: `cat ~/.runebook/observer-config.json`

For more details, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [ANALYSIS_LADDER.md](./ANALYSIS_LADDER.md) - Analysis system details
- [MEMORY.md](./MEMORY.md) - Memory storage schema

### PluresDB Integration

RuneBook integrates with PluresDB for persistent, P2P-enabled storage:

**Features:**
- Cross-device synchronization
- Local-first data storage
- P2P sharing capabilities
- SQLite-compatible API

**Setup:**
1. Install PluresDB: `npm install pluresdb` (already included)
2. Start PluresDB server on your machine
3. In RuneBook, click "⚙️ Storage Settings"
4. Select "PluresDB (P2P)"
5. Your canvases will now be stored in PluresDB

For more information, visit [PluresDB GitHub](https://github.com/plures/pluresdb).

## YAML Canvas Format

Canvas definitions use YAML for human-readable configuration:

```yaml
id: my-canvas
name: My Canvas
description: A sample canvas
version: 1.0.0

nodes:
  - id: terminal-1
    type: terminal
    position: { x: 100, y: 100 }
    label: Echo Command
    command: echo
    args: ["Hello, World!"]
    autoStart: true
    inputs: []
    outputs:
      - id: stdout
        name: stdout
        type: output

  - id: display-1
    type: display
    position: { x: 500, y: 100 }
    label: Output Display
    displayType: text
    inputs:
      - id: input
        name: input
        type: input
    outputs: []

connections:
  - from: terminal-1
    to: display-1
    fromPort: stdout
    toPort: input
```

## Architecture

RuneBook is built with:

- **Frontend**: Svelte 5 with SvelteKit for reactive UI
- **State Management**: Praxis reactive logic engine for type-safe, testable state
- **Backend**: Tauri (Rust) for native system access
- **Data Storage**: PluresDB for P2P-enabled persistent storage
- **Data Flow**: Reactive stores for automatic prop propagation
- **Serialization**: YAML for canvas definitions

### Project Structure

```
runebook/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── routes/             # SvelteKit routes
├── src-tauri/
│   ├── src/                # Rust backend
│   └── Cargo.toml          # Rust dependencies
├── static/
│   └── examples/           # Example canvas files
└── package.json            # Node dependencies
```

## Roadmap

### Implemented ✅
- [x] Visual canvas interface with drag-and-drop
- [x] Terminal nodes with command execution
- [x] Input widgets (text, number, checkbox, slider)
- [x] Display nodes (text, JSON, table)
- [x] Transform nodes (map, filter, reduce)
- [x] Reactive data flow between nodes
- [x] YAML canvas save/load
- [x] Browser storage for canvas persistence
- [x] **PluresDB integration** for P2P storage
- [x] Cross-platform desktop builds

### In Progress 🚧
- [ ] Interactive connection creation (drag from ports)
- [ ] Node deletion UI
- [ ] Canvas zoom and pan
- [ ] Keyboard shortcuts
- [ ] Undo/redo functionality

### Implemented ✅ (v0.3.0+)
- [x] **Ambient Agent Mode** - Command analysis and intelligent suggestions
- [x] **Headless CLI** - SSH-friendly agent management interface
- [x] **Event Capture System** - Terminal command tracking
- [x] **Pattern Analysis** - Detect frequent commands and patterns
- [x] **Suggestion Engine** - Generate actionable suggestions

### Planned 📋
- [ ] Advanced PluresDB features (encrypted sharing, device sync)
- [ ] MCP (Model Context Protocol) integration for AI assistance
- [ ] Sudolang support for natural language scripting
- [ ] WebSocket support for real-time data
- [ ] Plugin system for custom nodes
- [ ] Collaborative editing
- [ ] Canvas search and filtering
- [ ] Advanced transform nodes (custom JS, Python, etc.)
- [ ] More display types (charts, graphs, markdown)
- [ ] GUI integration for agent suggestions

See [CHANGELOG.md](./CHANGELOG.md) for completed features by version.

## Security

### Command Execution

RuneBook executes terminal commands with the following security measures:

- **Direct Execution**: Commands are executed directly using Rust's `std::process::Command`, not through a shell. This prevents shell injection attacks.
- **No Shell Interpretation**: Command strings like `ls | grep` won't work as shell pipelines. Each command must be a single executable.
- **Input Validation**: Commands are validated to prevent common dangerous patterns.
- **User Permissions**: All commands run with the same permissions as the RuneBook application (your user account).
- **Environment Variable Validation**: Environment variable names are validated to contain only alphanumeric characters and underscores.

### Transform Nodes

Transform nodes execute user-provided JavaScript expressions:

- **Local Execution Only**: JavaScript code runs in the browser/app context, not on a remote server
- **Personal Use**: Designed for personal workflows and trusted code only
- **No Sandboxing**: Code has access to the same permissions as the application
- **User Responsibility**: Only use transform expressions from trusted sources
- **Strict Mode**: All code executes in JavaScript strict mode for better error detection

### Best Practices

- Only run terminal nodes with commands you trust
- Be cautious when loading canvas files from unknown sources
- Review YAML canvas definitions before loading them
- Avoid storing sensitive data in canvas files
- Use environment variables for secrets when possible (and don't commit them to git)

### Future Security Enhancements

- Canvas permission system for sensitive operations
- Sandboxing for untrusted canvases
- Command whitelisting/blacklisting
- Audit logging for executed commands

## Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) before submitting PRs.

### For Maintainers

See [.github/WORKFLOWS.md](./.github/WORKFLOWS.md) for documentation on:
- Version bumping and release process
- CI/CD workflows
- Publishing to package registries

### For Maintainers

- **Releases**: See [RELEASE.md](./RELEASE.md) for quick start guide on making releases
- **Workflows**: See [.github/WORKFLOWS.md](./.github/WORKFLOWS.md) for detailed CI/CD documentation

## License

MIT License - see LICENSE file for details

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI framework: [Svelte 5](https://svelte.dev/)
- Inspired by node-based editors like Blender's Shader Editor and Unreal Engine's Blueprints
