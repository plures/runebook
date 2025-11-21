# RuneBook

RuneBook is a reactive, canvas-native computing environment that merges terminals, notebooks, and web components. Built on Svelte 5, PluresDB, Tauri, and Sudolang, RuneBook lets users wire terminals, inputs, and UI components on a visual canvas to create programmable, AI-enhanced workflows that behave like reactive web apps.

## Features

- **Visual Canvas Interface**: Drag-and-drop nodes on an infinite canvas
- **Terminal Nodes**: Execute shell commands with reactive output
- **Input Widgets**: Text inputs, sliders, checkboxes, and number inputs
- **Display Components**: Visualize data as text, JSON, tables, or charts
- **Reactive Data Flow**: Node outputs automatically flow to connected inputs
- **YAML Canvas Definitions**: Save and load canvas configurations
- **Cross-Platform**: Built with Tauri for Windows, macOS, and Linux

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

Click "💾 Save" to export your canvas as a YAML file. The file contains:

- Node definitions (type, position, configuration)
- Connection mappings
- Canvas metadata

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

- [ ] PluresDB integration for persistent storage
- [ ] MCP (Model Context Protocol) integration for AI assistance
- [ ] Sudolang support for natural language scripting
- [ ] Transform nodes for data processing
- [ ] WebSocket support for real-time data
- [ ] Plugin system for custom nodes
- [ ] Collaborative editing
- [ ] Canvas search and filtering
- [ ] Keyboard shortcuts
- [ ] Undo/redo functionality

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
