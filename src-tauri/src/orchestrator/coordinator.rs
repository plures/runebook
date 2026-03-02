//! Parallel execution coordinator.

use crate::core::coordination::{ApiRegistry, CoordinationChannel, CoordinationHandle};
use crate::core::ownership::OwnershipManager;
use crate::core::types::*;
use std::collections::HashMap;
use tokio::sync::RwLock;

/// Coordinates parallel agent execution
pub struct ExecutionCoordinator {
    plan: ExecutionPlan,
    ownership: OwnershipManager,
    api_registry: ApiRegistry,
    agent_status: HashMap<AgentId, AgentStatus>,
    coordination: CoordinationChannel,
    coordination_handle: CoordinationHandle,
}

impl ExecutionCoordinator {
    pub fn new(plan: ExecutionPlan) -> (Self, CoordinationHandle) {
        let (coordination, coordination_handle) = CoordinationChannel::new();

        // Initialize ownership manager
        let mut ownership = OwnershipManager::new();
        for file_ownership in &plan.file_ownership {
            ownership.register(file_ownership.clone());
        }

        // Initialize agent status
        let mut agent_status = HashMap::new();
        agent_status.insert(AgentId::Orchestrator, AgentStatus::Running);
        agent_status.insert(AgentId::Agent1, AgentStatus::Pending);
        agent_status.insert(AgentId::Agent2, AgentStatus::Pending);
        agent_status.insert(
            AgentId::Agent3,
            AgentStatus::WaitingForDependency(AgentId::Agent2),
        );
        agent_status.insert(
            AgentId::Agent4,
            AgentStatus::WaitingForDependency(AgentId::Agent3),
        );
        agent_status.insert(AgentId::Agent5, AgentStatus::Pending);
        agent_status.insert(AgentId::Agent6, AgentStatus::Pending);

        let coordinator = Self {
            plan,
            ownership,
            api_registry: ApiRegistry::new(),
            agent_status,
            coordination,
            coordination_handle: coordination_handle.clone(),
        };

        (coordinator, coordination_handle)
    }

    /// Process coordination messages and update agent status
    pub async fn process_coordination(&mut self) -> Result<(), String> {
        while let Some(message) = self.coordination.try_recv() {
            match message {
                CoordinationMessage::AgentReady(agent) => {
                    self.handle_agent_ready(agent).await?;
                }
                CoordinationMessage::ApiPublished(api) => {
                    self.handle_api_published(api).await?;
                }
                CoordinationMessage::TaskCompleted(agent, task_id) => {
                    self.handle_task_completed(agent, task_id).await?;
                }
                CoordinationMessage::CoordinationRequest {
                    requester,
                    target_agent,
                    target_module,
                    reason,
                } => {
                    self.handle_coordination_request(
                        requester,
                        target_agent,
                        target_module,
                        reason,
                    )
                    .await?;
                }
                CoordinationMessage::StatusUpdate(agent, status) => {
                    self.agent_status.insert(agent, status);
                }
                CoordinationMessage::CoordinationResponse { .. } => {
                    // Handle response (for future async coordination)
                }
            }
        }
        Ok(())
    }

    async fn handle_agent_ready(&mut self, agent: AgentId) -> Result<(), String> {
        // Check if agent can start based on dependencies
        let can_start = self.can_agent_start(agent);

        if can_start {
            self.agent_status.insert(agent, AgentStatus::Running);
            log::info!("Agent {:?} started", agent);
        } else {
            let dependency = self.get_blocking_dependency(agent);
            self.agent_status
                .insert(agent, AgentStatus::WaitingForDependency(dependency));
            log::info!("Agent {:?} waiting for dependency {:?}", agent, dependency);
        }
        Ok(())
    }

    async fn handle_api_published(&mut self, api: ApiPublished) -> Result<(), String> {
        self.api_registry.register(api.clone());

        // Check if Agent 3 can start now (depends on Agent 2 APIs)
        if api.agent == AgentId::Agent2 {
            if let Some(status) = self.agent_status.get_mut(&AgentId::Agent3) {
                if matches!(status, AgentStatus::WaitingForDependency(AgentId::Agent2)) {
                    *status = AgentStatus::Pending;
                    log::info!("Agent 3 can now start (Agent 2 API published)");
                }
            }
        }

        log::info!("API published: {} by {:?}", api.api_name, api.agent);
        Ok(())
    }

    async fn handle_task_completed(
        &mut self,
        agent: AgentId,
        task_id: String,
    ) -> Result<(), String> {
        // Update task status in plan
        if let Some(task) = self.plan.tasks.iter_mut().find(|t| t.id == task_id) {
            task.status = TaskStatus::Completed;
        }

        // Check if Agent 4 can start (depends on Agent 3 writing suggestions)
        if agent == AgentId::Agent3 && task_id == "agent3-2" {
            if let Some(status) = self.agent_status.get_mut(&AgentId::Agent4) {
                if matches!(status, AgentStatus::WaitingForDependency(AgentId::Agent3)) {
                    *status = AgentStatus::Pending;
                    log::info!("Agent 4 can now start (Agent 3 suggestions written)");
                }
            }
        }

        log::info!("Task completed: {} by {:?}", task_id, agent);
        Ok(())
    }

    async fn handle_coordination_request(
        &mut self,
        requester: AgentId,
        target_agent: AgentId,
        target_module: String,
        reason: String,
    ) -> Result<(), String> {
        // Check ownership
        if let Some(owner) = self.ownership.get_owner(&target_module) {
            if owner == requester {
                // Agent owns the module, no coordination needed
                return Ok(());
            }

            // Check if modification is allowed
            if !self.ownership.can_modify(requester, &target_module) {
                log::warn!(
                    "Coordination request denied: {:?} cannot modify {} (owned by {:?})",
                    requester,
                    target_module,
                    owner
                );
                return Err(format!(
                    "Agent {:?} does not own module {}",
                    owner, target_module
                ));
            }
        }

        log::info!(
            "Coordination request: {:?} wants to modify {} (owned by {:?}): {}",
            requester,
            target_module,
            target_agent,
            reason
        );
        // In a real implementation, this would notify the target agent
        Ok(())
    }

    fn can_agent_start(&self, agent: AgentId) -> bool {
        match agent {
            AgentId::Orchestrator => true,
            AgentId::Agent1 | AgentId::Agent2 | AgentId::Agent5 | AgentId::Agent6 => {
                // These can start after orchestrator
                self.agent_status
                    .get(&AgentId::Orchestrator)
                    .map(|s| matches!(s, AgentStatus::Running | AgentStatus::Completed))
                    .unwrap_or(false)
            }
            AgentId::Agent3 => {
                // Agent 3 needs Agent 2 APIs
                self.api_registry.get_agent_apis(AgentId::Agent2).len() > 0
            }
            AgentId::Agent4 => {
                // Agent 4 needs Agent 3 to write suggestions
                // Check if agent3-2 task is completed
                self.plan
                    .tasks
                    .iter()
                    .any(|t| t.id == "agent3-2" && t.status == TaskStatus::Completed)
            }
        }
    }

    fn get_blocking_dependency(&self, agent: AgentId) -> AgentId {
        match agent {
            AgentId::Agent3 => AgentId::Agent2,
            AgentId::Agent4 => AgentId::Agent3,
            _ => AgentId::Orchestrator,
        }
    }

    pub fn get_agent_status(&self, agent: AgentId) -> Option<&AgentStatus> {
        self.agent_status.get(&agent)
    }

    pub fn get_plan(&self) -> &ExecutionPlan {
        &self.plan
    }
}
