// PluresDB cognitive memory storage module
// Local-first "cognitive memory" for terminal events, commands, outputs, errors, insights, and suggestions

pub mod schema;
pub mod api;
pub mod migration;
pub mod encryption;
pub mod client;

#[cfg(test)]
mod tests;

pub use api::MemoryStore;
pub use schema::*;
pub use client::PluresDBClient;

use anyhow::Result;

/// Initialize the memory store with PluresDB connection
pub async fn init_memory_store(
    host: &str,
    port: u16,
    data_dir: &str,
) -> Result<MemoryStore> {
    let client = PluresDBClient::new(host, port, data_dir)?;
    let store = MemoryStore::new(client).await?;
    
    // Run migrations
    migration::run_migrations(&store).await?;
    
    Ok(store)
}

