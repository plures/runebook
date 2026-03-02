//! Parallel execution runner.

use crate::agents::*;
use crate::core::coordination::CoordinationHandle;
use crate::core::types::AgentId;
use crate::orchestrator::{create_execution_plan, ExecutionCoordinator};
use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};

/// Runs agents in parallel according to the execution plan
pub struct ParallelExecutionRunner {
    coordinator: Arc<RwLock<ExecutionCoordinator>>,
    coordination_handle: CoordinationHandle,
    agent1: Arc<Mutex<Agent1>>,
    agent2: Arc<Mutex<Agent2>>,
    agent3: Arc<Mutex<Agent3>>,
    agent4: Arc<Mutex<Agent4>>,
    agent5: Arc<Mutex<Agent5>>,
    agent6: Arc<Mutex<Agent6>>,
}

impl ParallelExecutionRunner {
    pub fn new() -> (Self, CoordinationHandle) {
        let plan = create_execution_plan();
        let (coordinator, coordination_handle) = ExecutionCoordinator::new(plan);
        let coordinator = Arc::new(RwLock::new(coordinator));

        (
            Self {
                coordinator,
                coordination_handle: coordination_handle.clone(),
                agent1: Arc::new(Mutex::new(Agent1::new())),
                agent2: Arc::new(Mutex::new(Agent2::new())),
                agent3: Arc::new(Mutex::new(Agent3::new())),
                agent4: Arc::new(Mutex::new(Agent4::new())),
                agent5: Arc::new(Mutex::new(Agent5::new())),
                agent6: Arc::new(Mutex::new(Agent6::new())),
            },
            coordination_handle,
        )
    }

    /// Execute all agents according to the parallel execution plan
    pub async fn execute(&mut self) -> Result<(), String> {
        log::info!("Starting parallel execution...");

        // Phase 1: Orchestrator (already done via create_execution_plan)
        log::info!("Phase 1: Orchestrator completed (roadmap, tasks, interfaces, ownership)");

        // Phase 2: Agent 1 and Agent 2 run in parallel
        log::info!("Phase 2: Starting Agent 1 and Agent 2 in parallel...");
        let agent1_handle = {
            let agent = Arc::clone(&self.agent1);
            let handle = self.coordination_handle.clone();
            tokio::spawn(async move {
                let mut agent = agent.lock().await;
                agent.initialize(handle.clone()).await?;
                agent.execute().await
            })
        };

        let agent2_handle = {
            let agent = Arc::clone(&self.agent2);
            let handle = self.coordination_handle.clone();
            tokio::spawn(async move {
                let mut agent = agent.lock().await;
                agent.initialize(handle.clone()).await?;
                agent.execute().await
            })
        };

        // Wait for both to complete
        let (result1, result2) = tokio::join!(agent1_handle, agent2_handle);
        result1.map_err(|e| format!("Agent 1 error: {:?}", e))??;
        result2.map_err(|e| format!("Agent 2 error: {:?}", e))??;

        // Process coordination messages
        self.coordinator
            .write()
            .await
            .process_coordination()
            .await?;

        // Phase 3: Agent 3 starts after Agent 2 publishes APIs
        log::info!("Phase 3: Starting Agent 3 (after Agent 2 APIs published)...");
        {
            let mut agent = self.agent3.lock().await;
            agent.initialize(self.coordination_handle.clone()).await?;
            agent.execute().await?;
        }

        // Process coordination messages
        self.coordinator
            .write()
            .await
            .process_coordination()
            .await?;

        // Phase 4: Agent 4 starts after Agent 3 writes suggestions
        log::info!("Phase 4: Starting Agent 4 (after Agent 3 writes suggestions)...");
        {
            let mut agent = self.agent4.lock().await;
            agent.initialize(self.coordination_handle.clone()).await?;
            agent.execute().await?;
        }

        // Phase 5: Agent 5 and Agent 6 run continuously
        log::info!("Phase 5: Starting Agent 5 and Agent 6 (continuous)...");
        let agent5_handle = {
            let agent = Arc::clone(&self.agent5);
            let handle = self.coordination_handle.clone();
            tokio::spawn(async move {
                let mut agent = agent.lock().await;
                agent.initialize(handle.clone()).await?;
                agent.execute().await
            })
        };

        let agent6_handle = {
            let agent = Arc::clone(&self.agent6);
            let handle = self.coordination_handle.clone();
            tokio::spawn(async move {
                let mut agent = agent.lock().await;
                agent.initialize(handle.clone()).await?;
                agent.execute().await
            })
        };

        // Wait for continuous agents (they run in background)
        let (result5, result6) = tokio::join!(agent5_handle, agent6_handle);
        result5.map_err(|e| format!("Agent 5 error: {:?}", e))??;
        result6.map_err(|e| format!("Agent 6 error: {:?}", e))??;

        // Finalize Agent 6
        {
            let mut agent = self.agent6.lock().await;
            agent.finalize().await?;
        }

        log::info!("Parallel execution completed!");
        Ok(())
    }
}
