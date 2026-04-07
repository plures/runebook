# RuneBook Roadmap

## Current: v0.3.x (pre-release)

## Phase 1: Canvas Core (v0.4)
- [ ] Node snapping — align nodes to grid and to each other
- [ ] Wire routing — bezier curves with collision avoidance
- [ ] Undo/redo — command pattern with full state history via Chronos
- [ ] Canvas minimap — overview navigation for large canvases
- [ ] Copy/paste — duplicate node groups with connections preserved

## Phase 2: Node Types (v0.5)
- [ ] HTTP request node — make API calls with headers, auth, body
- [ ] File watcher node — trigger on file system changes
- [ ] Timer node — periodic execution with configurable interval
- [ ] Database node — PluresDB query/write operations
- [ ] LLM node — model calls with streaming output
- [ ] Conditional node — if/else branching based on data

## Phase 3: Collaboration (v0.6)
- [ ] Canvas sharing — P2P sync of canvas state via PluresDB
- [ ] Presence — show collaborator cursors on shared canvases
- [ ] Canvas versioning — save/restore canvas snapshots
- [ ] Canvas templates — pre-built workflow templates
- [ ] Export — generate standalone scripts from canvas definitions

## Phase 4: Agent Integration (v0.7)
- [ ] Ambient agent — AI assistant that observes canvas and suggests improvements
- [ ] Natural language canvas creation — describe workflow, generate nodes
- [ ] Debug mode — step through node execution with state inspection
- [ ] Performance profiling — identify bottleneck nodes
- [ ] Headless execution — run canvases from CLI without GUI

## Phase 5: Production (v1.0)
- [ ] Auto-update via Tauri
- [ ] Plugin system — custom node types via pares-modulus
- [ ] Canvas marketplace — share and discover community canvases
- [ ] Documentation — interactive tutorials on canvas
- [ ] Cross-platform installers

