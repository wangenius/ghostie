use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use crate::llm::utils;

#[derive(Debug, Serialize, Deserialize)]
pub struct ModelConfig {
    pub api_key: String,
    pub api_url: String,
    pub model: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct Config {
    // 模型配置
    #[serde(default)]
    pub models: HashMap<String, ModelConfig>,
    // 当前模型
    #[serde(default)]
    pub current_model: Option<String>,
    // 是否自动启动
    #[serde(default)]
    pub auto_start: Option<bool>,
}

impl Config {
    pub fn load() -> Result<Self> {
        if let Some(path) = Self::get_path() {
            let mut config = if path.exists() {
                let content = fs::read_to_string(&path)?;
                toml::from_str(&content)?
            } else {
                let config = Config::default();
                config.save()?;
                config
            };

            // 如果没有当前模型，添加一个默认的 OpenAI 配置
            if config.current_model.is_none() {
                let default_name = "openai";
                let model_config = ModelConfig {
                    api_key: String::new(),
                    api_url: "https://api.openai.com/v1/chat/completions".to_string(),
                    model: "gpt-3.5-turbo".to_string(),
                };
                config.models.insert(default_name.to_string(), model_config);
                config.current_model = Some(default_name.to_string());
                config.save()?;
            }

            Ok(config)
        } else {
            Ok(Config::default())
        }
    }

    pub fn save(&self) -> Result<()> {
        if let Some(path) = Self::get_path() {
            let content = toml::to_string_pretty(self)?;
            utils::save_file(&content, &path)?;
        }
        Ok(())
    }

    pub fn get_path() -> Option<PathBuf> {
        let mut path = utils::get_config_dir()?;
        path.push("config.toml");
        Some(path)
    }

    pub fn add_model(
        &mut self,
        name: String,
        api_key: String,
        api_url: String,
        model: String,
    ) -> Result<()> {
        let model_config = ModelConfig {
            api_key,
            api_url,
            model,
        };
        self.models.insert(name.clone(), model_config);
        // 如果是第一个模型，设置为当前模型
        if self.current_model.is_none() {
            self.current_model = Some(name.clone());
        }
        self.save()?;
        Ok(())
    }

    pub fn remove_model(&mut self, name: &str) -> Result<()> {
        if self.models.remove(name).is_some() {
            // 如果删除的是当前模型，重置当前模型
            if self.current_model.as_deref() == Some(name) {
                self.current_model = self.models.keys().next().map(|k| k.to_string());
            }
            self.save()?;
            Ok(())
        } else {
            Err(anyhow::anyhow!("model not found: {}", name))
        }
    }

    pub fn set_current_model(&mut self, name: &str) -> Result<()> {
        if self.models.contains_key(name) {
            self.current_model = Some(name.to_string());
            self.save()?;
            Ok(())
        } else {
            Err(anyhow::anyhow!("model not found: {}", name))
        }
    }

    pub fn get_current_model(&self) -> Option<(&str, &ModelConfig)> {
        self.current_model
            .as_ref()
            .and_then(|name| self.models.get(name).map(|config| (name.as_str(), config)))
    }

    pub fn update_model(
        &mut self,
        old_name: &str,
        new_name: String,
        api_key: Option<String>,
        api_url: String,
        model: String,
    ) -> Result<()> {
        // 检查旧名称是否存在
        let old_config = self.models.get(old_name).ok_or_else(|| anyhow::anyhow!("model not found: {}", old_name))?;
        
        // 如果新名称与旧名称不同，检查新名称是否已存在
        if old_name != new_name && self.models.contains_key(&new_name) {
            return Err(anyhow::anyhow!("model already exists: {}", new_name));
        }

        // 创建新的配置
        let model_config = ModelConfig {
            api_key: api_key.unwrap_or_else(|| old_config.api_key.clone()),
            api_url,
            model,
        };

        // 如果名称发生变化
        if old_name != new_name {
            self.models.remove(old_name);
            // 如果更新的是当前模型，更新当前模型名称
            if self.current_model.as_deref() == Some(old_name) {
                self.current_model = Some(new_name.clone());
            }
        }
        
        // 插入新配置
        self.models.insert(new_name.clone(), model_config);
        self.save()?;
        Ok(())
    }
}
