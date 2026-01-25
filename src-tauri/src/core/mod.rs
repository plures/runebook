//! Shared types and interfaces for the RuneBook parallel execution system.
//!
//! This module contains types that are shared across all agents and the orchestrator.
//! All shared types should be defined here to avoid circular dependencies.

pub mod coordination;
pub mod ownership;
pub mod types;

pub use coordination::*;
pub use ownership::*;
pub use types::*;
