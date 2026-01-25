//! Agent 4: Surfaces
//!
//! Owns: src/lib/agent/surfaces.ts, integrations/
//! Starts after Agent 3 writes suggestions to store

use crate::agents::base::{Agent, AgentContext};
use crate::core::coordination::CoordinationHandle;
use crate::core::types::{AgentId, AgentStatus};
use async_trait::async_trait;

pub struct Agent4 {
    context: Option<AgentContext>,
    status: AgentStatus,
}

impl Agent4 {
    pub fn new() -> Self {
        Self {
            context: None,
            status: AgentStatus::Pending,
        }
    }
}

#[async_trait]
impl Agent for Agent4 {
    fn id(&self) -> AgentId {
        AgentId::Agent4
    }

    async fn initialize(&mut self, coordination: CoordinationHandle) -> Result<(), String> {
        self.context = Some(AgentContext::new(coordination, AgentId::Agent4));
        self.status = AgentStatus::Running;
        Ok(())
    }

    async fn execute(&mut self) -> Result<(), String> {
        // TODO: Implement suggestion surfaces
        // - Implement displaySuggestion
        // - Integrate with tmux, wezterm, vim, neovim
        // - Read suggestions from store (written by Agent 3)

        log::info!("Agent 4 (Surfaces) executing...");

        // Signal ready
        if let Some(ref ctx) = self.context {
            ctx.coordination.agent_ready(AgentId::Agent4)?;
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

impl Default for Agent4 {
    fn default() -> Self {
        Self::new()
    }
}
