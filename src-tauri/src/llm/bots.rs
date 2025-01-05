use std::fs;
use std::path::PathBuf;
use std::collections::HashMap;
use serde::{Serialize, Deserialize};
use anyhow::Result;
use colored::*;
use crate::llm::utils;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Bot {
    pub name: String,
    pub system_prompt: String,
}

#[derive(Debug, Default, Serialize, Deserialize)]
pub struct BotsConfig {
    pub bots: HashMap<String, Bot>,
    #[serde(default)]
    pub aliases: HashMap<String, String>,
    #[serde(default)]
    pub current: Option<String>,
    #[serde(default)]
    pub recent_bots: Vec<String>,
}

impl BotsConfig {
    pub fn load() -> Result<Self> {
        if let Some(path) = Self::get_path() {
            if path.exists() {
                let content = fs::read_to_string(&path)?;
                Ok(toml::from_str(&content)?)
            } else {
                let config = BotsConfig::default();
                config.save()?;
                Ok(config)
            }
        } else {
            Ok(BotsConfig::default())
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
        path.push("bots.toml");
        Some(path)
    }


    pub fn get(&self, name: &str) -> Option<&Bot> {
        self.bots.get(name)
    }


    
    pub fn add_bot(&mut self, name: String, system_prompt: String) -> Result<()> {
        let bot = Bot {
            name: name.clone(),
            system_prompt,
        };
        self.bots.insert(name.clone(), bot);
        self.save()?;
        println!("bot added: {}", name.green());
        Ok(())
    }
    
    pub fn remove_bot(&mut self, name: &str) -> Result<()> {
        if self.bots.remove(name).is_some() {
            self.save()?;
            println!("bot removed: {}", name.green());
            Ok(())
        } else {
            Err(anyhow::anyhow!("bot not found: {}", name))
        }
    }


    pub fn set_current(&mut self, name: &str) -> Result<()> {
        if !self.bots.contains_key(name) {
            return Err(anyhow::anyhow!("机器人不存在: {}", name));
        }
        self.current = Some(name.to_string());
        self.update_recent_bots(name)?;
        self.save()?;
        println!("当前机器人已设置为: {}", name.green());
        Ok(())
    }

    pub fn get_current(&self) -> Option<&Bot> {
        self.current.as_ref().and_then(|name| self.bots.get(name))
    }

    pub fn update_bot(
        &mut self,
        old_name: &str,
        new_name: String,
        system_prompt: String,
    ) -> Result<()> {
        if !self.bots.contains_key(old_name) {
            return Err(anyhow::anyhow!("bot not found: {}", old_name));
        }

        if old_name != new_name && self.bots.contains_key(&new_name) {
            return Err(anyhow::anyhow!("bot already exists: {}", new_name));
        }

        let bot = Bot {
            name: new_name.clone(),
            system_prompt,
        };

        if old_name != new_name {
            self.bots.remove(old_name);
            if self.current.as_deref() == Some(old_name) {
                self.current = Some(new_name.clone());
            }
            for (_, target) in self.aliases.iter_mut() {
                if target == old_name {
                    *target = new_name.clone();
                }
            }
        }

        self.bots.insert(new_name.clone(), bot);
        self.save()?;
        println!("bot updated: {}", new_name.green());
        Ok(())
    }

    pub fn update_recent_bots(&mut self, name: &str) -> Result<()> {
        self.recent_bots.retain(|x| x != name);
        self.recent_bots.insert(0, name.to_string());
        if self.recent_bots.len() > 10 {
            self.recent_bots.truncate(10);
        }
        self.save()?;
        Ok(())
    }
} 