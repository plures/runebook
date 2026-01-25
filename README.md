# RuneBook

RuneBook is a reactive, canvas-native computing environment that merges terminals, notebooks, and web components. Built on Svelte 5, PluresDB, Tauri, and Sudolang, RuneBook lets you wire terminals, inputs, and UI components on a visual canvas to create programmable, AI-enhanced workflows that behave like reactive web apps.

## Features

- **Visual Canvas Interface**: Drag-and-drop nodes on an infinite canvas
- **Terminal Nodes**: Execute shell commands with reactive output
- **Input Widgets**: Text inputs, sliders, checkboxes, and number inputs
- **Transform Nodes**: Process data with map, filter, and reduce operations
- **Display Components**: Visualize data as text, JSON, or tables
- **Reactive Data Flow**: Node outputs automatically flow to connected inputs
- **YAML Canvas Definitions**: Save and load canvas configurations
- **Ambient Agent Mode**: Intelligent command analysis and suggestions (opt-in)
- **Headless CLI**: SSH-friendly interface for agent management
- **Cross-Platform**: Windows, macOS, and Linux support

See [CHANGELOG.md](./CHANGELOG.md) for version history.

## Installation

### Download Pre-built Binaries

Download the latest release for your platform from [GitHub Releases](https://github.com/plures/runebook/releases):

- **macOS**: `.dmg` file (Intel and Apple Silicon)
- **Linux**: `.AppImage` or `.deb` file
- **Windows**: `.msi` or `.exe` installer

### Package Managers

**npm**:
```bash
npm install -g @plures/runebook
```

**NixOS / Nix Flakes**:
```bash
# Run directly from flake
nix run github:plures/runebook

# Build packages
nix build github:plures/runebook#runebook
nix build github:plures/runebook#runebook-agent
```

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- Rust 1.70 or higher
- Platform-specific dependencies:
  - **Linux**: webkit2gtk, rsvg2 (see [Tauri prerequisites](https://tauri.app/guides/prerequisites/#linux))
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft C++ Build Tools
  - **NixOS**: Use `nix develop` (includes all dependencies)

### Build from Source

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

**Development:**
```bash
nix develop  # Enter development shell
npm install
npm run dev
```

**Building:**
```bash
nix build .#runebook        # Build Tauri app
nix build .#runebook-agent  # Build headless agent CLI
```

**Running:**
```bash
nix run .#runebook                    # Run Tauri app
nix run .#runebook-agent -- agent status  # Run agent CLI
```

The flake includes a NixOS module for running `runebook-agent` as a systemd service. See [NIXOS.md](./NIXOS.md) for configuration details.

## Usage

### Creating Nodes

Use the toolbar to add nodes to the canvas:

- **⚡ Terminal**: Execute shell commands
- **📝 Input**: Create user input widgets
- **🔄 Transform**: Process and transform data
- **📊 Display**: Show data and outputs

### Connecting Nodes

1. Click and drag from an output port (right side of a node)
2. Drop on an input port (left side of another node)
3. Data flows automatically from output to input

### Saving and Loading

**Save Options:**
- **Browser Storage**: Save to localStorage (click "💾 Save to Storage")
- **PluresDB Storage**: P2P-enabled persistent storage (requires PluresDB server)
- **Export YAML**: Download canvas as a file (click "📥 Export YAML")

**Load Options:**
- **Saved Canvases**: Click "📚 Saved Canvases" to view your saved work
- **Load Example**: Click "📂 Load Example" to try pre-built demos

### Ambient Agent Mode

The Ambient Agent analyzes your terminal commands and provides intelligent suggestions. This feature runs in the background and operates entirely locally—no data leaves your machine.

**Features:**
- Captures terminal commands and outcomes automatically
- Analyzes patterns in command usage (frequency, success rates, performance)
- Suggests optimizations, shortcuts, and warnings
- Provides context-aware remediation suggestions for failures
- Uses multi-layer analysis (heuristics, local search, optional LLM)

**Enable via CLI:**
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

**Enable via Observer:**
```bash
# Enable terminal observer (captures all shell commands)
npm run observer enable

# View events in real-time
npm run observer events tail

# View recent events
npm run observer events 20
```

**What Data is Stored:**

All data is stored locally:
- Command names, arguments, and outputs
- Working directory
- Environment variables (secrets automatically redacted)
- Exit codes and execution duration
- Command patterns and error classifications
- Generated suggestions with confidence scores

**Storage locations:**
- Observer events: `~/.runebook/observer/events.json`
- Agent config: `~/.runebook/agent-config.json`
- PluresDB data: `./pluresdb-data` (if PluresDB enabled)

**Privacy & Security:**
- All data stored locally—never sent to external services
- Secrets automatically redacted (API keys, tokens, passwords)
- Opt-in by default (disabled until explicitly enabled)
- Configurable retention period (default: 30 days)

**CLI Commands:**

Agent:
- `npm run agent enable|disable|status`
- `npm run agent suggestions [priority]`
- `npm run agent events [limit]`
- `npm run agent clear [days]`

Observer:
- `npm run observer enable|disable|status`
- `npm run observer events [limit]`
- `npm run observer events tail`

Analysis:
- `npm run analyze last`

Memory:
- `npm run memory inspect`

For detailed documentation, see:
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Technical architecture
- [ANALYSIS_LADDER.md](./ANALYSIS_LADDER.md) - Analysis system
- [MEMORY.md](./MEMORY.md) - Memory storage schema

## Architecture

**Stack:**
- **Frontend**: Svelte 5 with SvelteKit
- **State Management**: Praxis reactive logic engine
- **Backend**: Tauri (Rust) for native system access
- **Storage**: PluresDB for P2P-enabled persistent storage
- **Serialization**: YAML for canvas definitions

**Project Structure:**
```
runebook/
├── src/
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── agent/          # Agent system
│   │   ├── core/           # Core utilities
│   │   └── types/          # TypeScript types
│   ├── cli/                # CLI commands
│   └── routes/             # SvelteKit routes
├── src-tauri/
│   ├── src/                # Rust backend
│   │   ├── agents/         # Agent implementations
│   │   ├── orchestrator/   # Orchestration logic
│   │   ├── execution/      # Command execution
│   │   └── memory/         # Memory/storage
│   └── Cargo.toml          # Rust dependencies
├── static/
│   └── examples/           # Example canvas files
└── flake.nix               # Nix build configuration
```

## Security

### Command Execution

- **Direct Execution**: Commands use Rust's `std::process::Command` (no shell interpretation)
- **No Shell Injection**: Command strings like `ls | grep` won't work as pipelines
- **User Permissions**: Commands run with your user account permissions
- **Environment Validation**: Variable names validated to prevent injection

### Transform Nodes

Transform nodes execute user-provided JavaScript:

- **Local Execution**: Runs in browser/app context only
- **No Sandboxing**: Has same permissions as the application
- **User Responsibility**: Only use code you trust
- **Strict Mode**: JavaScript strict mode enforced

### Best Practices

- Only run commands you trust
- Review canvas files before loading from unknown sources
- Avoid storing secrets in canvas definitions
- Use environment variables for sensitive data

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before submitting PRs.

### For Maintainers

- **Releases**: See [RELEASE.md](./RELEASE.md) for release process
- **Workflows**: See [.github/WORKFLOWS.md](./.github/WORKFLOWS.md) for CI/CD documentation

## License

MIT License - see LICENSE file for details.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Acknowledgments

Built with [Tauri](https://tauri.app/) and [Svelte 5](https://svelte.dev/). Inspired by node-based editors like Blender's Shader Editor and Unreal Engine's Blueprints.
