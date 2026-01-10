//! Coordination mechanisms for agent communication.

use super::types::{AgentId, CoordinationMessage, ApiPublished};
use tokio::sync::mpsc;
use std::collections::HashMap;

/// Coordination channel for agent communication
pub struct CoordinationChannel {
    sender: mpsc::UnboundedSender<CoordinationMessage>,
    receiver: mpsc::UnboundedReceiver<CoordinationMessage>,
}

impl CoordinationChannel {
    pub fn new() -> (Self, CoordinationHandle) {
        let (sender, receiver) = mpsc::unbounded_channel();
        let channel = Self { sender, receiver };
        let handle = CoordinationHandle {
            sender: channel.sender.clone(),
        };
        (channel, handle)
    }

    pub async fn recv(&mut self) -> Option<CoordinationMessage> {
        self.receiver.recv().await
    }

    pub fn try_recv(&mut self) -> Option<CoordinationMessage> {
        self.receiver.try_recv().ok()
    }
}

/// Handle for sending coordination messages
#[derive(Clone)]
pub struct CoordinationHandle {
    sender: mpsc::UnboundedSender<CoordinationMessage>,
}

impl CoordinationHandle {
    pub fn send(&self, message: CoordinationMessage) -> Result<(), String> {
        self.sender.send(message).map_err(|e| format!("Channel closed: {}", e))
    }

    pub fn agent_ready(&self, agent: AgentId) -> Result<(), String> {
        self.send(CoordinationMessage::AgentReady(agent))
    }

    pub fn api_published(&self, api: ApiPublished) -> Result<(), String> {
        self.send(CoordinationMessage::ApiPublished(api))
    }

    pub fn task_completed(&self, agent: AgentId, task_id: String) -> Result<(), String> {
        self.send(CoordinationMessage::TaskCompleted(agent, task_id))
    }

    pub fn status_update(&self, agent: AgentId, status: super::types::AgentStatus) -> Result<(), String> {
        self.send(CoordinationMessage::StatusUpdate(agent, status))
    }

    pub fn request_coordination(
        &self,
        requester: AgentId,
        target_agent: AgentId,
        target_module: String,
        reason: String,
    ) -> Result<(), String> {
        self.send(CoordinationMessage::CoordinationRequest {
            requester,
            target_agent,
            target_module,
            reason,
        })
    }
}

/// API registry for tracking published APIs
pub struct ApiRegistry {
    apis: HashMap<String, ApiPublished>,
}

impl ApiRegistry {
    pub fn new() -> Self {
        Self {
            apis: HashMap::new(),
        }
    }

    pub fn register(&mut self, api: ApiPublished) {
        self.apis.insert(api.api_name.clone(), api);
    }

    pub fn is_published(&self, api_name: &str) -> bool {
        self.apis.contains_key(api_name)
    }

    pub fn get_api(&self, api_name: &str) -> Option<&ApiPublished> {
        self.apis.get(api_name)
    }

    pub fn get_agent_apis(&self, agent: AgentId) -> Vec<&ApiPublished> {
        self.apis.values().filter(|api| api.agent == agent).collect()
    }
}

impl Default for ApiRegistry {
    fn default() -> Self {
        Self::new()
    }
}

