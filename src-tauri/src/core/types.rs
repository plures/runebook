//! Shared types for the parallel execution system.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Agent identifier
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub enum AgentId {
    Orchestrator,
    Agent1, // Event capture
    Agent2, // Storage APIs
    Agent3, // Analysis pipeline
    Agent4, // Surfaces
    Agent5, // Nix + CI scaffolding
    Agent6, // Finalization
}

impl AgentId {
    pub fn name(&self) -> &'static str {
        match self {
            AgentId::Orchestrator => "orchestrator",
            AgentId::Agent1 => "agent1-event-capture",
            AgentId::Agent2 => "agent2-storage-apis",
            AgentId::Agent3 => "agent3-analysis-pipeline",
            AgentId::Agent4 => "agent4-surfaces",
            AgentId::Agent5 => "agent5-nix-ci",
            AgentId::Agent6 => "agent6-finalization",
        }
    }
}

/// Agent execution status
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum AgentStatus {
    Pending,
    Running,
    WaitingForDependency(AgentId),
    Completed,
    Failed(String),
}

/// Task breakdown item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Task {
    pub id: String,
    pub description: String,
    pub owner: AgentId,
    pub dependencies: Vec<AgentId>,
    pub status: TaskStatus,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum TaskStatus {
    NotStarted,
    InProgress,
    Completed,
    Blocked(String),
}

/// Roadmap item
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RoadmapItem {
    pub phase: String,
    pub description: String,
    pub agents: Vec<AgentId>,
    pub dependencies: Vec<String>, // Phase IDs
}

/// Interface stub definition
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InterfaceStub {
    pub name: String,
    pub module_path: String,
    pub owner: AgentId,
    pub signature: String,
    pub description: String,
}

/// File ownership boundary
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileOwnership {
    pub path: String,
    pub owner: AgentId,
    pub description: String,
    pub shared: bool, // If true, other agents can read but not modify
}

/// API publication event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiPublished {
    pub agent: AgentId,
    pub api_name: String,
    pub interface_path: String,
    pub version: String,
    pub timestamp: chrono::DateTime<chrono::Utc>,
}

/// Coordination message
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum CoordinationMessage {
    /// Agent is ready to start
    AgentReady(AgentId),
    /// Agent has published an API
    ApiPublished(ApiPublished),
    /// Agent has completed a task
    TaskCompleted(AgentId, String), // agent, task_id
    /// Agent needs coordination to modify another agent's module
    CoordinationRequest {
        requester: AgentId,
        target_agent: AgentId,
        target_module: String,
        reason: String,
    },
    /// Orchestrator approval/rejection
    CoordinationResponse {
        request_id: String,
        approved: bool,
        reason: Option<String>,
    },
    /// Agent status update
    StatusUpdate(AgentId, AgentStatus),
}

/// Execution plan
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExecutionPlan {
    pub roadmap: Vec<RoadmapItem>,
    pub tasks: Vec<Task>,
    pub interfaces: Vec<InterfaceStub>,
    pub file_ownership: Vec<FileOwnership>,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

