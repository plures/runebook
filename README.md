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
- **Cross-Platform**: Built with Tauri for Windows, macOS, and Linux

See [CHANGELOG.md](./CHANGELOG.md) for version history and detailed feature information.

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Rust 1.70 or higher
- Platform-specific dependencies:
  - **Linux**: webkit2gtk, rsvg2 (see [Tauri prerequisites](https://tauri.app/guides/prerequisites/#linux))
  - **macOS**: Xcode Command Line Tools
  - **Windows**: Microsoft C++ Build Tools

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
- **Backend**: Tauri (Rust) for native system access
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

Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License

MIT License - see LICENSE file for details

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Acknowledgments

- Built with [Tauri](https://tauri.app/)
- UI framework: [Svelte 5](https://svelte.dev/)
- Inspired by node-based editors like Blender's Shader Editor and Unreal Engine's Blueprints
