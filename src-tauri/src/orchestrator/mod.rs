//! Orchestrator for parallel agent execution.
//!
//! The orchestrator:
//! 1. Creates roadmap and task breakdown
//! 2. Stubs interfaces
//! 3. Assigns file ownership boundaries
//! 4. Coordinates agent execution

pub mod coordinator;
pub mod planner;

pub use coordinator::*;
pub use planner::*;
