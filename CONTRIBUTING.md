# Contributing to RuneBook

Thank you for your interest in contributing to RuneBook! This document provides guidelines and information for contributors.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions. We're building a welcoming community for developers of all backgrounds.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/runebook.git`
3. Create a branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Test your changes thoroughly
6. Commit with clear messages: `git commit -m "Add feature: description"`
7. Push to your fork: `git push origin feature/your-feature-name`
8. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 20.x or higher
- Rust 1.70 or higher
- Platform-specific dependencies (see README.md)

### Installation

```bash
# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Run type checking
npm run check

# Build for production
npm run build
npm run tauri build

# Check version synchronization
npm run version:check
```

## Version Management

RuneBook maintains version numbers in three files:
- `package.json` (primary source)
- `src-tauri/Cargo.toml`
- `src-tauri/tauri.conf.json`

**Important**: Always use the automated version bump workflow instead of manually updating versions:

1. Go to Actions → Version Bump workflow
2. Select version type (patch/minor/major)
3. Run the workflow

To verify versions are synchronized locally:
```bash
npm run version:check
```

See [.github/WORKFLOWS.md](./.github/WORKFLOWS.md) for detailed release process documentation.

## Project Structure

```
runebook/
├── src/                    # Frontend source (Svelte)
│   ├── lib/
│   │   ├── components/     # Svelte components
│   │   ├── stores/         # State management
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── routes/             # SvelteKit routes
├── src-tauri/              # Rust backend
│   └── src/                # Rust source files
├── static/                 # Static assets
│   └── examples/           # Example canvas files
└── README.md               # Documentation
```

## Coding Standards

### TypeScript/Svelte

- Use TypeScript for type safety
- Follow Svelte 5 best practices (runes: $state, $derived, $effect)
- Use meaningful variable and function names
- Add JSDoc comments for complex functions
- Keep components focused and reusable
- Prefer event attributes (onclick) over on: directives

Example:
```typescript
// Good
function calculateNodePosition(node: CanvasNode): Position {
  // Clear logic with types
  return { x: node.position.x + 10, y: node.position.y };
}

// Component with proper typing
interface Props {
  node: TerminalNode;
}

let { node }: Props = $props();
```

### Rust

- Follow Rust conventions and idioms
- Use meaningful variable names
- Add doc comments for public functions
- Handle errors properly (Result types)
- Keep functions focused and testable

Example:
```rust
/// Executes a terminal command and returns the output
#[tauri::command]
async fn execute_terminal_command(
    command: String,
    args: Vec<String>,
) -> Result<String, String> {
    // Implementation
}
```

## Adding New Features

### Adding a New Node Type

1. Define the type in `src/lib/types/canvas.ts`:
   ```typescript
   export interface MyNode extends BaseNode {
     type: 'mynode';
     myProperty: string;
   }
   ```

2. Create the component in `src/lib/components/MyNode.svelte`

3. Update the Canvas component to render it

4. Add toolbar button in `Toolbar.svelte`

5. Update YAML examples if needed

### Adding a New Tauri Command

1. Define the function in `src-tauri/src/lib.rs`:
   ```rust
   #[tauri::command]
   async fn my_command(param: String) -> Result<String, String> {
       // Implementation
   }
   ```

2. Register in the Builder:
   ```rust
   .invoke_handler(tauri::generate_handler![
       greet,
       execute_terminal_command,
       my_command  // Add here
   ])
   ```

3. Call from frontend:
   ```typescript
   import { invoke } from '@tauri-apps/api/core';
   
   const result = await invoke<string>('my_command', { param: 'value' });
   ```

## Testing

Currently, RuneBook focuses on integration testing through the UI. Future contributions should include:

- Unit tests for utility functions
- Component tests for Svelte components
- Rust unit tests for backend functions
- Integration tests for Tauri commands

## Documentation

When adding features, please update:

- README.md - For user-facing features
- INTEGRATIONS.md - For planned integrations
- QUICKSTART.md - For simple tutorials
- Code comments - For implementation details

## Pull Request Process

1. **Before submitting:**
   - Run `npm run check` to verify TypeScript
   - Run `npm run build` to ensure it builds
   - Test your changes manually
   - Update documentation

2. **PR Description:**
   - Describe what the PR does
   - List any breaking changes
   - Include screenshots for UI changes
   - Reference related issues

3. **Review Process:**
   - Maintainers will review your PR
   - Address feedback promptly
   - Keep the PR scope focused
   - Rebase if needed

## Areas for Contribution

### High Priority

- [ ] Node connection UI (drag from ports to create connections)
- [ ] Canvas zoom and pan controls
- [ ] Keyboard shortcuts
- [ ] Undo/redo functionality
- [ ] Transform nodes for data processing
- [ ] Error handling improvements

### Medium Priority

- [ ] More input widget types (date, color, file)
- [ ] More display types (chart, graph, markdown)
- [ ] Canvas search and filtering
- [ ] Node grouping/containers
- [ ] Export canvas as image
- [ ] Theme customization

### Long Term

- [ ] PluresDB integration
- [ ] MCP integration for AI
- [ ] Sudolang support
- [ ] Plugin system
- [ ] Collaborative editing
- [ ] Cloud sync

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Your contributions make RuneBook better for everyone. We appreciate your time and effort!
