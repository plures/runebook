# RuneBook Roadmap

## Role in OASIS
RuneBook is the canvas-native reactive computing surface for OASIS. It is the flagship demo environment that wires PluresDB data flows, agents, and local-first UI into a single programmable canvas. RuneBook proves that OASIS primitives (agents + data + rules) can be composed by end users as live workflows.

## Current State (v0.3.x)
- Svelte 5 + Tauri app with reactive canvas
- Terminal nodes, input widgets, transform nodes, and display components
- YAML import/export for canvas definitions (in progress)
- Headless CLI and ambient agent mode (early)
- Open issues focus on PTY-backed terminal nodes and terminal wiring

## Near Term (v0.4.x)
- Finish terminal node stack end-to-end (xterm.js frontend + PTY backend + stdin/stdout graph wiring)
- Complete YAML import/export actions in GUI
- Storage selector: LocalStorage vs PluresDB (default to PluresDB for OASIS)
- Stabilize Windows/macOS/Linux builds + release automation

## Mid Term (v0.5.x–0.6.x)
- Agent node types (invoke pares-agens workflows, tool calls, and OASIS policy checks)
- PluresDB-backed project state (multi-canvas workspaces, history, versioning)
- Collaboration hooks (local-first sync, conflict resolution primitives)
- Performance pass on large canvases and long-running terminal streams

## Long Term (v1.0+)
- OASIS native workflow builder: commerce flows, privacy policy nodes, ZK proof verification nodes
- Marketplace for community node packs and templates
- Cross-device continuity (PluresDB + OASIS identity)
- Production-grade automation surface for OASIS user workflows
