# Parallel Execution Plan

This document describes the parallel execution system for RuneBook agents.

## Overview

The parallel execution plan coordinates multiple agents working on different parts of the RuneBook system simultaneously, with clear ownership boundaries and dependency management.

## Execution Order

### Phase 1: Orchestrator
**Agent**: Orchestrator  
**Tasks**:
- Create roadmap and task breakdown
- Stub all interfaces
- Assign file ownership boundaries
- Initialize coordination system

**Output**: Execution plan with roadmap, tasks, interfaces, and ownership boundaries

### Phase 2: Parallel Agents (Agent 1 + Agent 2)
**Agents**: Agent 1 (Event Capture) + Agent 2 (Storage APIs)  
**Execution**: Run in parallel  
**Dependencies**: Phase 1 (Orchestrator)

**Agent 1 Tasks**:
- Implement event capture system
- Owns: `src/lib/agent/capture.ts`, `src/lib/core/observer.ts`

**Agent 2 Tasks**:
- Implement storage APIs
- Publish storage API interface (triggers Phase 3)
- Owns: `src-tauri/src/memory/`

### Phase 3: Analysis Pipeline
**Agent**: Agent 3 (Analysis Pipeline)  
**Execution**: Starts after Agent 2 publishes APIs  
**Dependencies**: Phase 2 (Agent 2 APIs published)

**Tasks**:
- Implement analysis pipeline
- Write suggestions to store (triggers Phase 4)
- Owns: `src/lib/agent/analysis-pipeline.ts`, `analysis-service.ts`, `analyzers/`

### Phase 4: Surfaces
**Agent**: Agent 4 (Surfaces)  
**Execution**: Starts after Agent 3 writes suggestions to store  
**Dependencies**: Phase 3 (Agent 3 suggestions written)

**Tasks**:
- Implement suggestion surfaces
- Integrate with tmux, wezterm, vim, neovim
- Owns: `src/lib/agent/surfaces.ts`, `integrations/`

### Phase 5: Continuous Agents
**Agents**: Agent 5 (Nix + CI) + Agent 6 (Finalization)  
**Execution**: Run continuously (start early, Agent 6 finalizes at end)  
**Dependencies**: Phase 1 (Orchestrator)

**Agent 5 Tasks**:
- Set up Nix scaffolding (`flake.nix`, `shell.nix`)
- Set up CI scaffolding (`.github/workflows/`)
- Runs continuously (can be updated throughout)

**Agent 6 Tasks**:
- Finalize integration and testing
- Update `ValidationChecklist.md`
- Runs continuously but finalizes at the end

## Architecture

### Core Module (`src-tauri/src/core/`)

Shared types and coordination mechanisms:

- **`types.rs`**: Agent IDs, status, tasks, roadmap, interfaces, ownership, coordination messages
- **`ownership.rs`**: File ownership management and boundary checking
- **`coordination.rs`**: Coordination channels, API registry, message handling

### Orchestrator (`src-tauri/src/orchestrator/`)

- **`planner.rs`**: Creates execution plan (roadmap, tasks, interfaces, ownership)
- **`coordinator.rs`**: Coordinates parallel execution, tracks dependencies, manages agent status

### Agents (`src-tauri/src/agents/`)

Each agent implements the `Agent` trait:

- **`base.rs`**: Base agent trait and common functionality
- **`agent1.rs`**: Event capture agent
- **`agent2.rs`**: Storage APIs agent
- **`agent3.rs`**: Analysis pipeline agent
- **`agent4.rs`**: Surfaces agent
- **`agent5.rs`**: Nix + CI agent
- **`agent6.rs`**: Finalization agent

### Execution Runner (`src-tauri/src/execution/`)

- **`runner.rs`**: Parallel execution runner that orchestrates agent execution according to the plan

## Coordination Rules

### Ownership Boundaries

1. **No agent changes another agent's owned module without coordinating via orchestrator**
   - Agents must request coordination to modify files owned by other agents
   - Orchestrator approves/rejects coordination requests
   - Shared types go in `runebook-core` module

2. **File Ownership**:
   - Each agent has clear ownership of specific files/directories
   - Ownership is enforced by the `OwnershipManager`
   - Shared files are marked with `shared: true`

### API Publishing

- Agent 2 publishes storage APIs via `CoordinationMessage::ApiPublished`
- Agent 3 waits for Agent 2 APIs before starting
- API registry tracks all published APIs

### Task Completion

- Agents signal task completion via `CoordinationMessage::TaskCompleted`
- Agent 3 signals when suggestions are written (triggers Agent 4)
- Coordinator tracks task status and unblocks dependent agents

## Usage

```rust
use runebook::execution::ParallelExecutionRunner;

// Create runner
let (mut runner, _handle) = ParallelExecutionRunner::new();

// Execute all agents according to the plan
runner.execute().await?;
```

## Integration with Existing Code

The parallel execution plan integrates with existing RuneBook components:

- **Event Capture**: Agent 1 extends `src/lib/agent/capture.ts`
- **Storage APIs**: Agent 2 extends `src-tauri/src/memory/api.rs`
- **Analysis Pipeline**: Agent 3 extends `src/lib/agent/analysis-pipeline.ts`
- **Surfaces**: Agent 4 extends `src/lib/agent/surfaces.ts` and `integrations/`
- **Nix/CI**: Agent 5 manages `flake.nix`, `shell.nix`, `.github/workflows/`
- **Finalization**: Agent 6 updates `ValidationChecklist.md`

## Next Steps

1. Implement Agent 1: Complete event capture system
2. Implement Agent 2: Complete storage APIs and publish interfaces
3. Implement Agent 3: Complete analysis pipeline and write suggestions
4. Implement Agent 4: Complete suggestion surfaces
5. Implement Agent 5: Complete Nix and CI scaffolding
6. Implement Agent 6: Complete finalization tasks

Each agent should follow the ownership boundaries and coordinate via the orchestrator when needed.

