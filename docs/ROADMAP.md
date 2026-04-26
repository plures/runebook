# RuneBook Roadmap

## Role in Plures Ecosystem

RuneBook is the canvas‑native IDE for building reactive workflows with terminals, inputs, and UI components. It brings PluresDB, Praxis, and local‑first automation together in a visual programming surface.

## Current State

Canvas UI, node types (terminal, input, transform, display), YAML export/import, and a headless agent/observer CLI are implemented. Tauri + Svelte 5 app scaffolding is in place with a Rust backend. Gaps remain in deeper PluresDB storage integration, richer node library, and UX polish for large canvases.

## Milestones

### Near-term (Q2 2026)

- Add terminal node reliability improvements (streaming output, cancellation).
- Improve canvas UX: snapping, multi‑select, alignment tools, zoom/pan polish.
- PluresDB storage path for saved canvases (beyond localStorage/YAML).
- Expand node library for file IO and basic system actions.

### Mid-term (Q3-Q4 2026)

- Agent integration on canvas (nodes for suggestions, diagnostics, summaries).
- Runtime node inspection and provenance tracking for data flows.
- Performance tuning for large graphs (virtualized rendering, incremental layout).
- Packaging refinements for headless CLI and systemd/Nix integration.

### Long-term

- Collaborative canvases via P2P sync (shared sessions).
- Plugin API for third‑party node packs.
- Visual debugging timeline powered by Chronos diffs.
