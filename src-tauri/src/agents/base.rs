//! Base agent trait and common functionality.

use crate::core::types::{AgentId, AgentStatus};
use crate::core::coordination::CoordinationHandle;
use async_trait::async_trait;

/// Base trait for all agents
#[async_trait]
pub trait Agent: Send + Sync {
    /// Get the agent's ID
    fn id(&self) -> AgentId;

    /// Get the agent's name
    fn name(&self) -> &'static str {
        self.id().name()
    }

    /// Initialize the agent
    async fn initialize(&mut self, coordination: CoordinationHandle) -> Result<(), String>;

    /// Execute the agent's main work
    async fn execute(&mut self) -> Result<(), String>;

    /// Get current status
    fn status(&self) -> AgentStatus;

    /// Check if agent can start (dependencies met)
    fn can_start(&self) -> bool {
        matches!(self.status(), AgentStatus::Pending | AgentStatus::Running)
    }
}

/// Agent execution context
pub struct AgentContext {
    pub coordination: CoordinationHandle,
    pub agent_id: AgentId,
}

impl AgentContext {
    pub fn new(coordination: CoordinationHandle, agent_id: AgentId) -> Self {
        Self {
            coordination,
            agent_id,
        }
    }
}

