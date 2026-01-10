//! File ownership boundaries and coordination rules.

use super::types::{AgentId, FileOwnership};
use std::collections::HashMap;

/// Manages file ownership boundaries
pub struct OwnershipManager {
    ownership_map: HashMap<String, FileOwnership>,
}

impl OwnershipManager {
    pub fn new() -> Self {
        Self {
            ownership_map: HashMap::new(),
        }
    }

    /// Register file ownership
    pub fn register(&mut self, ownership: FileOwnership) {
        self.ownership_map.insert(ownership.path.clone(), ownership);
    }

    /// Check if an agent can modify a file
    pub fn can_modify(&self, agent: AgentId, path: &str) -> bool {
        if let Some(ownership) = self.ownership_map.get(path) {
            ownership.owner == agent || (ownership.shared && ownership.owner == agent)
        } else {
            // If not registered, allow (for now - orchestrator should register all)
            true
        }
    }

    /// Check if an agent can read a file
    pub fn can_read(&self, _agent: AgentId, path: &str) -> bool {
        // All agents can read shared files
        if let Some(ownership) = self.ownership_map.get(path) {
            ownership.shared || true // For now, allow all reads
        } else {
            true
        }
    }

    /// Get owner of a file
    pub fn get_owner(&self, path: &str) -> Option<AgentId> {
        self.ownership_map.get(path).map(|o| o.owner)
    }

    /// Get all files owned by an agent
    pub fn get_agent_files(&self, agent: AgentId) -> Vec<&FileOwnership> {
        self.ownership_map
            .values()
            .filter(|o| o.owner == agent)
            .collect()
    }
}

impl Default for OwnershipManager {
    fn default() -> Self {
        Self::new()
    }
}

