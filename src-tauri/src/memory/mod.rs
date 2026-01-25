// PluresDB cognitive memory storage module
// Local-first "cognitive memory" for terminal events, commands, outputs, errors, insights, and suggestions

pub mod api;
pub mod client;
pub mod encryption;
pub mod migration;
pub mod schema;

#[cfg(test)]
mod tests;

pub use api::MemoryStore;
pub use client::PluresDBClient;
pub use schema::*;

use anyhow::Result;

/// Initialize the memory store with PluresDB connection
pub async fn init_memory_store(host: &str, port: u16, data_dir: &str) -> Result<MemoryStore> {
    let client = PluresDBClient::new(host, port, data_dir)?;
    let store = MemoryStore::new(client).await?;

    // Run migrations
    migration::run_migrations(&store).await?;

    Ok(store)
}
