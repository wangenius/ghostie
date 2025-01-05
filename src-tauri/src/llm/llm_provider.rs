use anyhow::Result;
use futures::{Stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::fmt;
use std::pin::Pin;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub bot: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FunctionDef {
    pub name: String,
    pub description: String,
    pub parameters: serde_json::Value,
}

#[async_trait::async_trait]
pub trait LLMProvider: Send + Sync {
    async fn chat(
        &self,
        messages: Vec<Message>,
        stream: bool,
        running: Arc<AtomicBool>,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String>> + Send>>>;
}

pub struct Provider {
    client: reqwest::Client,
    api_key: String,
    api_url: String,
    model: String,
    json_mode: bool,
    functions: Option<Vec<FunctionDef>>,
}

impl fmt::Debug for Provider {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.debug_struct("Provider")
            .field("api_url", &self.api_url)
            .field("model", &self.model)
            .field("json_mode", &self.json_mode)
            .field("functions", &self.functions)
            // 不输出敏感信息
            .field("api_key", &"[REDACTED]")
            .finish()
    }
}

impl Clone for Provider {
    fn clone(&self) -> Self {
        Self {
            client: self.client.clone(),
            api_key: self.api_key.clone(),
            api_url: self.api_url.clone(),
            model: self.model.clone(),
            json_mode: self.json_mode,
            functions: self.functions.clone(),
        }
    }
}

impl Provider {
    pub fn new(api_key: String) -> Self {
        Self {
            client: reqwest::Client::builder()
                .danger_accept_invalid_certs(true)
                .no_proxy()
                .build()
                .unwrap_or_else(|_| reqwest::Client::new()),
            api_key,
            api_url: "https://api.openai.com/v1/chat/completions".to_string(),
            model: "gpt-3.5-turbo".to_string(),
            json_mode: false,
            functions: None,
        }
    }

    pub fn with_url(mut self, url: String) -> Self {
        self.api_url = url;
        self
    }

    pub fn with_model(mut self, model: String) -> Self {
        self.model = model;
        self
    }

    fn get_api_url(&self) -> String {
        self.api_url.clone()
    }
}

#[async_trait::async_trait]
impl LLMProvider for Provider {
    async fn chat(
        &self,
        messages: Vec<Message>,
        stream: bool,
        running: Arc<AtomicBool>,
    ) -> Result<Pin<Box<dyn Stream<Item = Result<String>> + Send>>> {
        let request_body = {
            let mut body = serde_json::json!({
                "model": self.model,
                "messages": messages,
                "stream": stream
            });

            if self.json_mode {
                body.as_object_mut().unwrap().insert(
                    "response_format".to_string(),
                    serde_json::json!({"type": "json_object"}),
                );
            }

            if let Some(functions) = &self.functions {
                body.as_object_mut()
                    .unwrap()
                    .insert("functions".to_string(), serde_json::json!(functions));
            }
            body
        };

        let mut headers = reqwest::header::HeaderMap::new();
        headers.insert("Content-Type", "application/json".parse().unwrap());
        headers.insert(
            "Authorization",
            format!("Bearer {}", self.api_key).parse().unwrap(),
        );
        headers.insert("X-DashScope-SSE", "enable".parse().unwrap());
        headers.insert("x-foo", "true".parse().unwrap());

        let api_url = self.get_api_url();

        let response = self
            .client
            .post(&api_url)
            .headers(headers)
            .json(&request_body)
            .send()
            .await?;

        let status = response.status();
        if !status.is_success() {
            let error_text = response.text().await?;
            return Err(anyhow::anyhow!(
                "API request failed with status {}: {}",
                status,
                error_text
            ));
        }

        let running = running.clone();
        if !stream {
            let response_text = response.text().await?;
            let response_json: serde_json::Value = serde_json::from_str(&response_text)?;

            let content =  response_json["choices"][0]["message"]["content"].as_str()
            .ok_or_else(|| anyhow::anyhow!("Failed to extract content from response"))?
            .to_string();

            let stream = futures::stream::once(async { Ok(content) });
            return Ok(Box::pin(stream));
        }

        let stream = response
            .bytes_stream()
            .take_while(move |_| {
                let continue_running = running.load(Ordering::SeqCst);
                async move { continue_running }
            })
            .map(move |chunk| -> Result<String> {
                let chunk = chunk.map_err(anyhow::Error::from)?;
                let text = String::from_utf8_lossy(&chunk);

                let mut result = String::new();
                for line in text.lines() {
                    if line.starts_with("data: ") {
                        let json_str = &line[6..];
                        if json_str.trim() == "[DONE]" {
                            continue;
                        }
                        if let Ok(response_json) =
                            serde_json::from_str::<serde_json::Value>(json_str)
                        {
                            if let Some(error_msg) = response_json["error_msg"].as_str() {
                                return Err(anyhow::anyhow!("API Error: {}", error_msg));
                            }
                            if let Some(content) =
                                response_json["choices"][0]["delta"]["content"].as_str()
                            {
                                result.push_str(content);
                            } else if let Some(content) =
                                response_json["choices"][0]["message"]["content"].as_str()
                            {
                                result.push_str(content);
                            }
                        }
                    }
                }
                Ok(result)
            });

        Ok(Box::pin(stream))
    }
}
