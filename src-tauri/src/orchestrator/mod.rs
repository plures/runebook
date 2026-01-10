//! Orchestrator for parallel agent execution.
//!
//! The orchestrator:
//! 1. Creates roadmap and task breakdown
//! 2. Stubs interfaces
//! 3. Assigns file ownership boundaries
//! 4. Coordinates agent execution

pub mod planner;
pub mod coordinator;

pub use planner::*;
pub use coordinator::*;

