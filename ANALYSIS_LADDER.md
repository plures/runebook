# Analysis Ladder

The Analysis Ladder is a multi-layer approach to analyzing command failures and generating actionable suggestions. It runs in the background, is non-blocking, and never auto-executes commands—only suggests.

## Architecture

The analysis pipeline consists of three layers, executed in order:

### Layer 1: Heuristic Classifiers

**Purpose**: Fast, deterministic pattern matching for common errors.

**Analyzers**:
- **NixErrorAnalyzer**: Detects Nix-specific errors
  - Missing attributes (e.g., `attribute "cursor" missing`)
  - Flake-parts template path errors
  - buildEnv font conflicts
  - Nix evaluation errors

- **GitAuthAnalyzer**: Detects Git/GitHub authentication issues
  - GitHub rate limit errors
  - Git authentication failures
  - Missing token environment variables

- **SyntaxErrorAnalyzer**: Detects syntax and command errors
  - Syntax errors with file/line numbers
  - Command not found errors

**Characteristics**:
- High confidence (0.7-0.95)
- Fast execution (< 100ms)
- No external dependencies
- Deterministic results

### Layer 2: Local Search

**Purpose**: Search repository and configuration files for context.

**Analyzer**:
- **LocalSearchAnalyzer**: Uses ripgrep (or grep fallback) to search:
  - Repository files (flake.nix, *.nix, *.sh, etc.)
  - Configuration files
  - Environment variable references
  - Related error patterns

**Characteristics**:
- Medium confidence (0.6-0.8)
- Moderate execution time (100-500ms)
- Requires repository context
- May skip if Layer 1 produces high-confidence results

### Layer 3: Optional LLM/MCP (Gated)

**Purpose**: Intelligent analysis using language models or MCP.

**Analyzer**:
- **LLMAnalyzer**: Placeholder for future LLM/MCP integration
  - Currently disabled by default
  - Can be enabled via configuration
  - Would provide intelligent, context-aware suggestions

**Characteristics**:
- Variable confidence (depends on model)
- Slower execution (1-5s)
- Requires API access
- Only runs if explicitly enabled

## Job System

### Failure Detection

Failures are detected when:
1. An `exit_status` event has `success: false` (non-zero exit code)
2. Known stderr patterns match error signatures
3. Command context is available (command, args, cwd, env)

### Job Queue

- **Non-blocking**: Jobs run in the background
- **Cancelable**: Jobs can be cancelled if pending
- **Context Windows**: Each job includes:
  - Full command context (command, args, cwd, env)
  - Complete stdout/stderr output
  - Previous commands (last 5)
  - All related events

### Job States

- `pending`: Queued, waiting to run
- `running`: Currently being analyzed
- `completed`: Analysis finished, suggestions available
- `cancelled`: User cancelled the job
- `failed`: Analysis encountered an error

## Structured Suggestions

Each suggestion includes:

```typescript
interface AnalysisSuggestion {
  id: string;
  type: 'command' | 'optimization' | 'shortcut' | 'warning' | 'tip';
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  confidence: number; // 0.0 to 1.0
  actionableSnippet?: string; // Code snippet or command to fix
  provenance: {
    analyzer: string; // Which analyzer produced this
    layer: number; // Which layer (1, 2, or 3)
    timestamp: number;
  };
  timestamp: number;
}
```

### Confidence Scores

- **0.9-1.0**: Very high confidence, likely correct
- **0.7-0.9**: High confidence, probably correct
- **0.5-0.7**: Medium confidence, worth checking
- **< 0.5**: Low confidence, may be speculative

## Usage

### CLI Command

```bash
# Analyze the last command failure
runebook analyze last
```

### Programmatic API

```typescript
import { getAnalysisService } from './lib/agent/analysis-service';
import { createObserver } from './lib/core';

const observer = createObserver({ enabled: true });
await observer.initialize();

const analysisService = getAnalysisService();
analysisService.initialize(store, config);
analysisService.setEnabled(true);

// Process exit status events
const jobId = await analysisService.processExitStatus(exitStatusEvent);

// Get results
const job = analysisService.getJob(jobId);
console.log(job.suggestions);
```

## Pluggable Analyzers

You can create custom analyzers by implementing the `Analyzer` interface:

```typescript
interface Analyzer {
  name: string;
  layer: number; // 1, 2, or 3
  analyze(context: AnalysisContext, store: EventStore): Promise<AnalysisSuggestion[]>;
}
```

Example:

```typescript
class CustomAnalyzer implements Analyzer {
  name = 'custom-analyzer';
  layer = 1;

  async analyze(context: AnalysisContext, store: EventStore): Promise<AnalysisSuggestion[]> {
    const suggestions: AnalysisSuggestion[] = [];
    
    // Your analysis logic here
    if (context.stderr.includes('your-pattern')) {
      suggestions.push({
        id: `suggestion_${Date.now()}`,
        type: 'warning',
        priority: 'high',
        title: 'Your Title',
        description: 'Your description',
        confidence: 0.8,
        actionableSnippet: '# Your fix here',
        provenance: {
          analyzer: this.name,
          layer: this.layer,
          timestamp: Date.now(),
        },
        timestamp: Date.now(),
      });
    }
    
    return suggestions;
  }
}

// Register it
const queue = new AnalysisJobQueue(store);
queue.registerAnalyzer(new CustomAnalyzer());
```

## Best Practices

1. **Layer 1 First**: Use heuristic analyzers for fast, common errors
2. **Layer 2 for Context**: Use local search when you need repository context
3. **Layer 3 Sparingly**: Only enable LLM/MCP for complex cases
4. **High Confidence**: Prefer high-confidence suggestions (>0.7)
5. **Actionable Snippets**: Always include actionable code/commands
6. **Provenance**: Track which analyzer produced each suggestion

## Testing

Fixture-based tests verify that analyzers produce expected remediations for:

- GitHub rate limit / token env issues
- flake-parts template path errors
- Nix buildEnv font conflicts
- Missing attribute "cursor"

See `src/lib/agent/__tests__/analysis-pipeline.test.ts` for examples.

## Future Enhancements

- [ ] LLM/MCP integration for Layer 3
- [ ] Learning from user feedback
- [ ] Cross-session pattern learning
- [ ] Suggestion ranking and deduplication
- [ ] Integration with IDE/editor plugins

