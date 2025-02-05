use crate::config::utils;
use anyhow::Result;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ModelConfig {
    pub api_key: String,
    pub api_url: String,
    pub model: String,
}

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct ModelManager {
    #[serde(default)]
    pub models: BTreeMap<String, ModelConfig>,
    #[serde(default)]
    pub current: Option<String>,
}

impl ModelManager {
    fn load() -> Result<Self> {
        if let Some(path) = Self::get_path() {
            let config = if path.exists() {
                let content = fs::read_to_string(&path)?;
                toml::from_str(&content)?
            } else {
                let config = ModelManager::default();
                config.save_to_disk()?;
                config
            };
            Ok(config)
        } else {
            Ok(ModelManager::default())
        }
    }

    fn save_to_disk(&self) -> Result<()> {
        if let Some(path) = Self::get_path() {
            let content = toml::to_string(self)?;
            if let Some(parent) = path.parent() {
                fs::create_dir_all(parent)?;
            }
            fs::write(path, content)?;
        }
        Ok(())
    }

    pub fn get_path() -> Option<PathBuf> {
        let mut path = utils::get_config_dir()?;
        path.push("config.toml");
        Some(path)
    }

    pub fn add(name: String, model: ModelConfig) -> Result<()> {
        let mut manager = Self::load()?;
        manager.models.insert(name.clone(), model.clone());
        if manager.current.is_none() {
            manager.current = Some(name);
        }

        manager.save_to_disk()?;
        Ok(())
    }

    pub fn remove(name: String) -> Result<()> {
        let mut manager = Self::load()?;
        if manager.models.remove(&name).is_some() {
            if manager.current.as_deref() == Some(&name) {
                manager.current = manager.models.keys().next().map(|k| k.to_string());
            }
            manager.save_to_disk()?;
            Ok(())
        } else {
            Err(anyhow::anyhow!("model not found: {}", name))
        }
    }

    pub fn set_current(name: &str) -> Result<()> {
        let mut manager = Self::load()?;
        if manager.models.contains_key(name) {
            manager.current = Some(name.to_string());
            manager.save_to_disk()?;
            Ok(())
        } else {
            Err(anyhow::anyhow!("model not found: {}", name))
        }
    }

    pub fn get_current() -> Option<ModelConfig> {
        Self::load().ok().and_then(|manager| {
            manager
                .current
                .and_then(|name| manager.models.get(&name))
                .cloned()
        })
    }

    pub fn update_model(name: String, new_name: String, model: ModelConfig) -> Result<()> {
        let mut manager = Self::load()?;
        if !manager.models.contains_key(&name) {
            return Err(anyhow::anyhow!("model not found: {}", name));
        }

        if name != new_name {
            if manager.models.contains_key(&new_name) {
                return Err(anyhow::anyhow!("model already exists: {}", new_name));
            }

            manager.models.remove(&name);

            if manager.current.as_deref() == Some(&name) {
                manager.current = Some(new_name.to_string());
            }
        }

        manager.models.insert(new_name.to_string(), model);
        manager.save_to_disk()?;
        Ok(())
    }

    pub fn list_models() -> Result<ModelManager> {
        Self::load()
    }
}
