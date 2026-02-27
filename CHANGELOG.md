## [0.5.0] — 2026-02-24

- feat: bundle OpenDyslexic Mono Nerd Font as default mono font (e489a15)

## [0.4.2] — 2026-02-24

- fix: strip duplicate ports, fill containers, add base styles (db2c96f)

## [0.4.1] — 2026-02-24

- fix: CSS 403, add node resize + interactive connection drawing (20f8e19)

## [0.4.0] — 2026-02-23

- feat: replace hand-styled components with design-dojo primitives (#40) (4ffc4b9)
- test: Playwright e2e coverage for core RuneBook flows + fix InputNode reactive loop (#38) (766f5cf)
- chore: add copilot instructions and org standards (6412fee)
- chore: integrate @plures/design-dojo as UI component library (#31) (d057f91)
- Add Playwright E2E smoke tests (production-like build) (#26) (14cd86d)
- Fix node button reactivity by using Praxis store dispatch (#25) (7c29e6a)

# Changelog

All notable changes to RuneBook will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-01-25

### Added
- **Praxis Integration**: Integrated @plures/praxis v1.2.0 for reactive state management
  - Type-safe event-driven architecture with defineEvent and defineRule
  - Reactive logic engine replacing manual Svelte stores
  - Improved testability and maintainability of state management
  - Backward-compatible API wrapper for existing components

### Changed
- Refactored canvas state management to use Praxis reactive engine
- State updates now use events (AddNodeEvent, UpdateNodeEvent, etc.) for better traceability
- Improved type safety across the state management layer

## [0.2.0] - 2024-12-27

### Added
- **Transform Nodes**: New node type for data transformation between nodes
  - Map transform: Apply functions to array elements
  - Filter transform: Filter array elements based on conditions
  - Reduce transform: Aggregate array data into single values
  - Sudolang transform placeholder (planned for future implementation)
- **Storage System**: Canvas persistence with localStorage and PluresDB
  - LocalStorage adapter for browser-based storage
  - **PluresDB adapter**: Full integration with PluresDB for P2P-enabled storage
  - Switch between storage adapters in UI
  - Export canvases as YAML files
  - Storage abstraction layer with pluggable adapters
- Transform node button in toolbar
- Canvas rendering support for transform nodes
- PluresDB integration (v1.3.1) with key-value API
- Example canvas file demonstrating transform nodes
- Storage settings UI to switch between LocalStorage and PluresDB

### Changed
- Updated all dependencies to latest versions
- Improved documentation structure
- README.md now focuses on latest features
- Version-specific information moved to CHANGELOG.md
- Toolbar reorganized with save/load options and storage settings

### Security
- Added "use strict" mode for JavaScript expression execution in transform nodes
- Input validation for transform node arrays
- Canvas data validation in storage layer
- Fixed reduce operation with proper initial value
- Documented security considerations for transform nodes
- CodeQL security scan: 0 alerts

### Documentation
- Created CHANGELOG.md for version history tracking
- Updated IMPLEMENTATION.md to reflect actual completion status
- Clarified roadmap items in README.md as implemented vs. planned
- Added storage documentation to README
- Added security notes for transform nodes
- Documented PluresDB integration

## [0.1.0] - 2024-11-21

### Added
- Initial Tauri + Svelte 5 project structure
- Canvas UI system with infinite workspace and grid background
- Three core node types:
  - **Terminal Nodes**: Execute shell commands with reactive output
  - **Input Nodes**: User input widgets (text, number, checkbox, slider)
  - **Display Nodes**: Data visualization (text, JSON, table)
- Reactive data flow system using Svelte 5 runes
- YAML canvas loader for save/load functionality
- Example canvas files:
  - `hello-world.yaml`: Basic echo and input demonstration
  - `date-time-example.yaml`: Multiple terminals and displays
- Rust backend with Tauri for native system access
- Terminal command execution with security measures:
  - Direct execution (no shell interpretation)
  - Input validation
  - Environment variable validation
- Toolbar with node creation and canvas management
- SVG-based connection rendering
- Comprehensive documentation:
  - README.md: User guide and getting started
  - QUICKSTART.md: Step-by-step tutorial
  - CONTRIBUTING.md: Developer contribution guide
  - ARCHITECTURE.md: Technical design documentation
  - INTEGRATIONS.md: Future feature plans
  - LICENSE: MIT License

### Security
- Command execution without shell interpretation to prevent injection attacks
- Environment variable name validation
- Input validation for commands and arguments

## [Unreleased]

### Planned Features
- PluresDB integration for persistent storage
- MCP (Model Context Protocol) integration for AI assistance
- Sudolang support for natural language scripting
- Interactive connection creation (drag from ports)
- Canvas zoom and pan controls
- Node deletion UI
- Keyboard shortcuts
- Undo/redo functionality
- WebSocket support for real-time data
- Plugin system for custom nodes
- Collaborative editing
- Canvas search and filtering
