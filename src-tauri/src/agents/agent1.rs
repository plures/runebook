//! Agent 1: Event Capture
//!
//! Owns: src/lib/agent/capture.ts, src/lib/core/observer.ts
//! Runs in parallel with Agent 2

use crate::agents::base::{Agent, AgentContext};
use crate::core::coordination::CoordinationHandle;
use crate::core::types::{AgentId, AgentStatus};
use async_trait::async_trait;

pub struct Agent1 {
    context: Option<AgentContext>,
    status: AgentStatus,
}

impl Agent1 {
    pub fn new() -> Self {
        Self {
            context: None,
            status: AgentStatus::Pending,
        }
    }
}

#[async_trait]
impl Agent for Agent1 {
    fn id(&self) -> AgentId {
        AgentId::Agent1
    }

    async fn initialize(&mut self, coordination: CoordinationHandle) -> Result<(), String> {
        self.context = Some(AgentContext::new(coordination, AgentId::Agent1));
        self.status = AgentStatus::Running;
        Ok(())
    }

    async fn execute(&mut self) -> Result<(), String> {
        // TODO: Implement event capture system
        // - Implement captureCommandStart
        // - Implement captureCommandResult
        // - Integrate with terminal observer

        log::info!("Agent 1 (Event Capture) executing...");

        // Signal ready
        if let Some(ref ctx) = self.context {
            ctx.coordination.agent_ready(AgentId::Agent1)?;
        }

        // Simulate work
        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;

        self.status = AgentStatus::Completed;
        Ok(())
    }

    fn status(&self) -> AgentStatus {
        self.status.clone()
    }
}

impl Default for Agent1 {
    fn default() -> Self {
        Self::new()
    }
}
