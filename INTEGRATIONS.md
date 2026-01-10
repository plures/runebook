# Integration Plans

## PluresDB Integration

PluresDB will provide persistent storage for canvas definitions, node states, and user data.

### Planned Features

- **Canvas Storage**: Save and load canvas configurations from the database
- **Node State Persistence**: Store terminal outputs and node values
- **History Tracking**: Version control for canvas changes
- **Search**: Full-text search across canvas definitions and node content

### Implementation Notes

PluresDB integration will be added in a future iteration. The current YAML-based system provides a foundation for understanding the data model.

## MCP (Model Context Protocol) Integration

MCP will enable AI assistance within RuneBook workflows.

### Planned Features

- **AI Transform Nodes**: Process data using LLM capabilities
- **Natural Language Commands**: Create and modify canvas elements via text
- **Code Generation**: Generate terminal commands and scripts
- **Data Analysis**: Analyze terminal outputs and suggest insights
- **Autocomplete**: Suggest next nodes based on workflow context

### Use Cases

1. **Command Suggestion**: "Show me disk usage" → generates `du -sh` terminal node
2. **Data Transformation**: Transform JSON output to different formats
3. **Error Analysis**: Analyze error messages and suggest fixes
4. **Workflow Optimization**: Suggest improvements to canvas layouts

### Integration Approach

1. Add MCP client to Tauri backend
2. Create MCP server connector nodes
3. Implement prompt templates for common operations
4. Add AI suggestion UI components

## Sudolang Support

Sudolang will provide a natural language interface for creating and manipulating canvas workflows.

### Planned Features

- **Natural Language Node Creation**: "Create a terminal that lists files"
- **Flow Description**: Describe entire workflows in prose
- **Dynamic Scripting**: Write Sudolang scripts that generate canvas configurations
- **Interactive Refinement**: Conversational workflow building

### Example Sudolang Workflow

```sudolang
Create a workflow that:
1. Gets the current date
2. Lists all files in the current directory
3. Counts the number of files
4. Displays all information in separate panels

Connect the outputs appropriately.
```

This would automatically generate:
- A terminal node running `date`
- A terminal node running `ls`
- A terminal node running `ls | wc -l`
- Three display nodes showing the outputs
- Connections between all nodes

### Implementation Notes

Sudolang integration will require:
1. Parser for Sudolang syntax
2. Code generator that creates canvas YAML
3. Interpreter for dynamic execution
4. REPL-style interface for interactive development

## Transform Nodes

Transform nodes will enable data processing between nodes.

### Types of Transforms

1. **Map**: Transform each item in a collection
2. **Filter**: Select items matching criteria
3. **Reduce**: Aggregate data into a single value
4. **Parse**: Convert between formats (JSON, CSV, XML)
5. **Sudolang**: Custom transformations using natural language

### Example

```
Terminal (ls -l) → Transform (parse file listing) → Display (table view)
```

## Ambient Agent Mode (Term-Agent Capabilities)

Ambient Agent Mode provides intelligent command analysis and suggestions, similar to term-agent capabilities.

### Implemented Features ✅

- **Event Capture**: Automatic capture of terminal commands, outputs, and context
- **Storage/Memory**: Persistent storage of events and patterns (in-memory or PluresDB)
- **Analysis Engine**: Pattern detection, failure analysis, performance analysis
- **Suggestion System**: Generate actionable suggestions (shortcuts, optimizations, warnings)
- **Headless CLI**: SSH-friendly interface for agent management
- **Opt-in Design**: Disabled by default, requires explicit enable
- **Terminal Observer**: Low-level shell event capture with bash/zsh adapters
- **Analysis Ladder**: 3-layer analysis system (heuristic → local search → optional LLM)
- **Cognitive Memory**: PluresDB-based persistent storage with Rust API
- **Event Schema**: Canonical event types for all terminal activities
- **Memory Schema**: Structured storage for sessions, commands, outputs, errors, insights, suggestions
- **Security Model**: Secret redaction, opt-in design, local-only storage
- **Demo Script**: Automated walkthrough (scripts/demo.sh)

### Architecture

```
Terminal Command → Event Capture → Storage → Analysis → Suggestions
                      ↓              ↓          ↓
                 Observer Layer  Memory    Analysis Ladder
                 (bash/zsh)      (PluresDB) (3 layers)
                                                      ↓
                                              CLI / UI Display
```

### Event Schema

The system captures canonical event types:
- `command_start`: Command begins execution
- `command_end`: Command completes
- `stdout_chunk`: Incremental stdout output
- `stderr_chunk`: Incremental stderr output
- `exit_status`: Command exit code
- `cwd_change`: Working directory changed
- `env_change`: Environment variables changed
- `session_start`: Terminal session started
- `session_end`: Terminal session ended

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full event schema details.

### Memory Schema

Cognitive memory storage organizes data into:
- **Sessions**: Terminal session metadata
- **Commands**: Normalized command records
- **Outputs**: Chunked stdout/stderr (optionally compressed)
- **Errors**: Classified error records
- **Insights**: AI/heuristic annotations
- **Suggestions**: Ranked recommendations
- **Provenance**: Source tracking

See [MEMORY.md](./MEMORY.md) for full memory schema details.

### Analysis Ladder

Three-layer analysis system:
1. **Layer 1**: Heuristic classifiers (fast, deterministic, high confidence)
2. **Layer 2**: Local search (context-aware, medium confidence)
3. **Layer 3**: Optional LLM/MCP (gated, disabled by default)

See [ANALYSIS_LADDER.md](./ANALYSIS_LADDER.md) for full details.

### Usage

**Enable via CLI:**
```bash
npm run agent enable
npm run agent status
npm run agent suggestions
npm run analyze last
npm run memory inspect
```

**Enable Observer (captures all shell commands):**
```bash
npm run observer enable
npm run observer events tail
```

**Enable via Code:**
```typescript
import { initAgent } from './lib/agent/integration';

initAgent({
  enabled: true,
  captureEvents: true,
  analyzePatterns: true,
  suggestImprovements: true,
});
```

### Data Policy

- **Opt-in by default**: Agent is disabled until explicitly enabled
- **Local-only storage**: All data stored locally, no external services
- **Secret redaction**: Automatic detection and redaction of API keys, tokens, passwords
- **Configurable retention**: Default 30 days, customizable
- **No background daemon**: Runs only when explicitly enabled
- **Clear data policy**: User controls what is stored and for how long

### CLI Surface

Full headless interface:
- `npm run agent <command>`: Agent management (enable, disable, status, suggestions, events, clear)
- `npm run observer <command>`: Observer management (enable, disable, status, events, tail)
- `npm run analyze <command>`: Analysis commands (last)
- `npm run memory <command>`: Memory inspection (inspect)

### Demo

Run the automated demo:
```bash
bash scripts/demo.sh
```

Or follow the walkthrough in [docs/demo.md](./docs/demo.md).

### Future Enhancements

- GUI integration for suggestions display
- Advanced ML-based pattern analysis
- Cross-session pattern learning
- Suggestion action buttons (apply directly)
- Nushell adapter for terminal observer
- Real-time event streaming (WebSocket-based)

## Future Integration Priorities

1. **Phase 1**: Transform nodes with JavaScript ✅
2. **Phase 2**: PluresDB for persistence ✅
3. **Phase 2.5**: Ambient Agent Mode ✅
4. **Phase 3**: MCP for AI assistance
5. **Phase 4**: Sudolang for natural language workflows

## Contributing

If you'd like to contribute to any of these integrations, please see the main README for contribution guidelines.
