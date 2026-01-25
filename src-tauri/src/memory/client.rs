// PluresDB HTTP client wrapper
// Communicates with PluresDB server via HTTP API
//
// NOTE: The HTTP API endpoints used here are placeholders.
// The actual PluresDB HTTP API may differ. Adjust endpoints
// based on the actual PluresDB server API documentation.
// Alternatively, consider using a Rust FFI binding to PluresDB
// if available, or the SQLiteCompatibleAPI via FFI.

use anyhow::{Context, Result};
use reqwest::Client;
use serde_json::Value;
use std::time::Duration;

pub struct PluresDBClient {
    client: Client,
    base_url: String,
    data_dir: String,
}

impl PluresDBClient {
    pub fn new(host: &str, port: u16, data_dir: &str) -> Result<Self> {
        let base_url = format!("http://{}:{}", host, port);

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .context("Failed to create HTTP client")?;

        Ok(Self {
            client,
            base_url,
            data_dir: data_dir.to_string(),
        })
    }

    /// Put a value into PluresDB
    pub async fn put(&self, key: &str, value: &Value) -> Result<()> {
        let url = format!("{}/api/v1/put", self.base_url);
        let payload = serde_json::json!({
            "key": key,
            "value": value,
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .context("Failed to send PUT request")?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("PluresDB PUT failed with status {}: {}", status, text);
        }

        Ok(())
    }

    /// Get a value from PluresDB
    pub async fn get(&self, key: &str) -> Result<Option<Value>> {
        let url = format!("{}/api/v1/get", self.base_url);
        let payload = serde_json::json!({
            "key": key,
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .context("Failed to send GET request")?;

        if response.status() == 404 {
            return Ok(None);
        }

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("PluresDB GET failed with status {}: {}", status, text);
        }

        let result: Value = response.json().await.context("Failed to parse response")?;
        Ok(result.get("value").cloned())
    }

    /// List keys with a prefix
    pub async fn list(&self, prefix: &str) -> Result<Vec<String>> {
        let url = format!("{}/api/v1/list", self.base_url);
        let payload = serde_json::json!({
            "prefix": prefix,
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .context("Failed to send LIST request")?;

        if !response.status().is_success() {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("PluresDB LIST failed with status {}: {}", status, text);
        }

        let result: Value = response.json().await.context("Failed to parse response")?;
        let keys = result
            .get("keys")
            .and_then(|v| v.as_array())
            .ok_or_else(|| anyhow::anyhow!("Invalid LIST response format"))?;

        Ok(keys
            .iter()
            .filter_map(|v| v.as_str().map(|s| s.to_string()))
            .collect())
    }

    /// Delete a key
    pub async fn delete(&self, key: &str) -> Result<()> {
        let url = format!("{}/api/v1/delete", self.base_url);
        let payload = serde_json::json!({
            "key": key,
        });

        let response = self
            .client
            .post(&url)
            .json(&payload)
            .send()
            .await
            .context("Failed to send DELETE request")?;

        if !response.status().is_success() && response.status() != 404 {
            let status = response.status();
            let text = response.text().await.unwrap_or_default();
            anyhow::bail!("PluresDB DELETE failed with status {}: {}", status, text);
        }

        Ok(())
    }

    /// Check if PluresDB server is available
    pub async fn health_check(&self) -> Result<bool> {
        let url = format!("{}/health", self.base_url);
        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}
