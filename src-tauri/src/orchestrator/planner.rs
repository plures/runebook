//! Execution plan creation and task breakdown.

use crate::core::types::*;

/// Creates the execution plan with roadmap, tasks, interfaces, and ownership
pub fn create_execution_plan() -> ExecutionPlan {
    let roadmap = create_roadmap();
    let tasks = create_task_breakdown();
    let interfaces = create_interface_stubs();
    let file_ownership = create_file_ownership();

    ExecutionPlan {
        roadmap,
        tasks,
        interfaces,
        file_ownership,
        created_at: chrono::Utc::now(),
    }
}

fn create_roadmap() -> Vec<RoadmapItem> {
    vec![
        RoadmapItem {
            phase: "phase-1-orchestration".to_string(),
            description:
                "Orchestrator creates roadmap, task breakdown, stubs interfaces, assigns ownership"
                    .to_string(),
            agents: vec![AgentId::Orchestrator],
            dependencies: vec![],
        },
        RoadmapItem {
            phase: "phase-2-parallel-agents".to_string(),
            description: "Agent 1 (event capture) and Agent 2 (storage APIs) run in parallel"
                .to_string(),
            agents: vec![AgentId::Agent1, AgentId::Agent2],
            dependencies: vec!["phase-1-orchestration".to_string()],
        },
        RoadmapItem {
            phase: "phase-3-analysis".to_string(),
            description: "Agent 3 (analysis pipeline) starts after Agent 2 publishes APIs"
                .to_string(),
            agents: vec![AgentId::Agent3],
            dependencies: vec!["phase-2-parallel-agents".to_string()],
        },
        RoadmapItem {
            phase: "phase-4-surfaces".to_string(),
            description: "Agent 4 (surfaces) starts after Agent 3 writes suggestions to store"
                .to_string(),
            agents: vec![AgentId::Agent4],
            dependencies: vec!["phase-3-analysis".to_string()],
        },
        RoadmapItem {
            phase: "phase-5-continuous".to_string(),
            description: "Agent 5 (nix + CI) and Agent 6 (finalization) run continuously"
                .to_string(),
            agents: vec![AgentId::Agent5, AgentId::Agent6],
            dependencies: vec!["phase-1-orchestration".to_string()],
        },
    ]
}

fn create_task_breakdown() -> Vec<Task> {
    vec![
        // Orchestrator tasks
        Task {
            id: "orch-1".to_string(),
            description: "Create roadmap and task breakdown".to_string(),
            owner: AgentId::Orchestrator,
            dependencies: vec![],
            status: TaskStatus::NotStarted,
        },
        Task {
            id: "orch-2".to_string(),
            description: "Stub all interfaces".to_string(),
            owner: AgentId::Orchestrator,
            dependencies: vec![],
            status: TaskStatus::NotStarted,
        },
        Task {
            id: "orch-3".to_string(),
            description: "Assign file ownership boundaries".to_string(),
            owner: AgentId::Orchestrator,
            dependencies: vec![],
            status: TaskStatus::NotStarted,
        },
        // Agent 1 tasks
        Task {
            id: "agent1-1".to_string(),
            description: "Implement event capture system".to_string(),
            owner: AgentId::Agent1,
            dependencies: vec![AgentId::Orchestrator],
            status: TaskStatus::NotStarted,
        },
        // Agent 2 tasks
        Task {
            id: "agent2-1".to_string(),
            description: "Implement storage APIs".to_string(),
            owner: AgentId::Agent2,
            dependencies: vec![AgentId::Orchestrator],
            status: TaskStatus::NotStarted,
        },
        Task {
            id: "agent2-2".to_string(),
            description: "Publish storage API interface".to_string(),
            owner: AgentId::Agent2,
            dependencies: vec![AgentId::Agent2], // Depends on agent2-1
            status: TaskStatus::NotStarted,
        },
        // Agent 3 tasks
        Task {
            id: "agent3-1".to_string(),
            description: "Implement analysis pipeline".to_string(),
            owner: AgentId::Agent3,
            dependencies: vec![AgentId::Agent2], // Waits for Agent 2 APIs
            status: TaskStatus::NotStarted,
        },
        Task {
            id: "agent3-2".to_string(),
            description: "Write suggestions to store".to_string(),
            owner: AgentId::Agent3,
            dependencies: vec![AgentId::Agent3], // Depends on agent3-1
            status: TaskStatus::NotStarted,
        },
        // Agent 4 tasks
        Task {
            id: "agent4-1".to_string(),
            description: "Implement suggestion surfaces".to_string(),
            owner: AgentId::Agent4,
            dependencies: vec![AgentId::Agent3], // Waits for Agent 3 suggestions
            status: TaskStatus::NotStarted,
        },
        // Agent 5 tasks (continuous)
        Task {
            id: "agent5-1".to_string(),
            description: "Set up Nix scaffolding".to_string(),
            owner: AgentId::Agent5,
            dependencies: vec![AgentId::Orchestrator],
            status: TaskStatus::NotStarted,
        },
        Task {
            id: "agent5-2".to_string(),
            description: "Set up CI scaffolding".to_string(),
            owner: AgentId::Agent5,
            dependencies: vec![AgentId::Orchestrator],
            status: TaskStatus::NotStarted,
        },
        // Agent 6 tasks (continuous, finalizes at end)
        Task {
            id: "agent6-1".to_string(),
            description: "Finalize integration and testing".to_string(),
            owner: AgentId::Agent6,
            dependencies: vec![AgentId::Orchestrator],
            status: TaskStatus::NotStarted,
        },
    ]
}

fn create_interface_stubs() -> Vec<InterfaceStub> {
    vec![
        // Agent 1 interfaces
        InterfaceStub {
            name: "EventCapture".to_string(),
            module_path: "src/lib/agent/capture.ts".to_string(),
            owner: AgentId::Agent1,
            signature: "captureCommandStart(command: string, args: string[], cwd: string): Promise<void>".to_string(),
            description: "Capture command start event".to_string(),
        },
        InterfaceStub {
            name: "EventCapture".to_string(),
            module_path: "src/lib/agent/capture.ts".to_string(),
            owner: AgentId::Agent1,
            signature: "captureCommandResult(commandId: string, result: CommandResult): Promise<void>".to_string(),
            description: "Capture command result event".to_string(),
        },
        // Agent 2 interfaces
        InterfaceStub {
            name: "StorageApi".to_string(),
            module_path: "src-tauri/src/memory/api.rs".to_string(),
            owner: AgentId::Agent2,
            signature: "async fn append_event(event: MemoryEvent) -> Result<()>".to_string(),
            description: "Append event to storage".to_string(),
        },
        InterfaceStub {
            name: "StorageApi".to_string(),
            module_path: "src-tauri/src/memory/api.rs".to_string(),
            owner: AgentId::Agent2,
            signature: "async fn list_sessions() -> Result<Vec<Session>>".to_string(),
            description: "List all sessions".to_string(),
        },
        InterfaceStub {
            name: "StorageApi".to_string(),
            module_path: "src-tauri/src/memory/api.rs".to_string(),
            owner: AgentId::Agent2,
            signature: "async fn persist_suggestion(suggestion: Suggestion) -> Result<()>".to_string(),
            description: "Persist suggestion to store".to_string(),
        },
        // Agent 3 interfaces
        InterfaceStub {
            name: "AnalysisPipeline".to_string(),
            module_path: "src/lib/agent/analysis-pipeline.ts".to_string(),
            owner: AgentId::Agent3,
            signature: "enqueueFailure(commandId: string, events: TerminalObserverEvent[]): Promise<string | null>".to_string(),
            description: "Enqueue command failure for analysis".to_string(),
        },
        // Agent 4 interfaces
        InterfaceStub {
            name: "SuggestionSurface".to_string(),
            module_path: "src/lib/agent/surfaces.ts".to_string(),
            owner: AgentId::Agent4,
            signature: "displaySuggestion(suggestion: Suggestion): void".to_string(),
            description: "Display suggestion on surface".to_string(),
        },
    ]
}

fn create_file_ownership() -> Vec<FileOwnership> {
    vec![
        // Core/shared types
        FileOwnership {
            path: "src-tauri/src/core".to_string(),
            owner: AgentId::Orchestrator,
            description: "Shared types and coordination mechanisms".to_string(),
            shared: true,
        },
        // Agent 1 ownership
        FileOwnership {
            path: "src/lib/agent/capture.ts".to_string(),
            owner: AgentId::Agent1,
            description: "Event capture implementation".to_string(),
            shared: false,
        },
        FileOwnership {
            path: "src/lib/core/observer.ts".to_string(),
            owner: AgentId::Agent1,
            description: "Terminal observer core".to_string(),
            shared: false,
        },
        // Agent 2 ownership
        FileOwnership {
            path: "src-tauri/src/memory".to_string(),
            owner: AgentId::Agent2,
            description: "Storage APIs and memory schema".to_string(),
            shared: false,
        },
        // Agent 3 ownership
        FileOwnership {
            path: "src/lib/agent/analysis-pipeline.ts".to_string(),
            owner: AgentId::Agent3,
            description: "Analysis pipeline implementation".to_string(),
            shared: false,
        },
        FileOwnership {
            path: "src/lib/agent/analysis-service.ts".to_string(),
            owner: AgentId::Agent3,
            description: "Analysis service".to_string(),
            shared: false,
        },
        FileOwnership {
            path: "src/lib/agent/analyzers".to_string(),
            owner: AgentId::Agent3,
            description: "Analysis analyzers".to_string(),
            shared: false,
        },
        // Agent 4 ownership
        FileOwnership {
            path: "src/lib/agent/surfaces.ts".to_string(),
            owner: AgentId::Agent4,
            description: "Suggestion surfaces implementation".to_string(),
            shared: false,
        },
        FileOwnership {
            path: "integrations".to_string(),
            owner: AgentId::Agent4,
            description: "Integration surfaces (tmux, wezterm, vim, etc.)".to_string(),
            shared: false,
        },
        // Agent 5 ownership
        FileOwnership {
            path: "flake.nix".to_string(),
            owner: AgentId::Agent5,
            description: "Nix flake configuration".to_string(),
            shared: false,
        },
        FileOwnership {
            path: "shell.nix".to_string(),
            owner: AgentId::Agent5,
            description: "Nix shell environment".to_string(),
            shared: false,
        },
        FileOwnership {
            path: ".github/workflows".to_string(),
            owner: AgentId::Agent5,
            description: "CI/CD workflows".to_string(),
            shared: false,
        },
        // Agent 6 ownership
        FileOwnership {
            path: "ValidationChecklist.md".to_string(),
            owner: AgentId::Agent6,
            description: "Validation checklist updates".to_string(),
            shared: false,
        },
    ]
}
