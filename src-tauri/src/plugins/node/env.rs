use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

use crate::plugins::node::error::{PluginError, Result};

/// 环境变量结构
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EnvVar {
    pub key: String,
    pub value: String,
}

/// 环境变量管理器
pub struct EnvManager {
    env_file: PathBuf,
}

impl EnvManager {
    /// 创建新的环境变量管理器
    pub fn new() -> Result<Self> {
        let env_file = crate::utils::file::get_config_dir()
            .ok_or_else(|| PluginError::Plugin("无法获取配置目录".to_string()))?
            .join("plugins")
            .join(".env");
        Ok(Self { env_file })
    }

    /// 加载环境变量
    pub async fn load(&self) -> Result<Vec<EnvVar>> {
        if !self.env_file.exists() {
            return Ok(Vec::new());
        }

        let content = fs::read_to_string(&self.env_file)?;
        Ok(content
            .lines()
            .filter(|line| !line.trim().is_empty() && !line.starts_with('#'))
            .filter_map(|line| {
                let parts: Vec<&str> = line.splitn(2, '=').collect();
                if parts.len() == 2 {
                    Some(EnvVar {
                        key: parts[0].trim().to_string(),
                        value: parts[1].trim().to_string(),
                    })
                } else {
                    None
                }
            })
            .collect())
    }

    /// 保存环境变量
    pub async fn save(&self, vars: &[EnvVar]) -> Result<()> {
        let content = vars
            .iter()
            .map(|var| format!("{}={}", var.key, var.value))
            .collect::<Vec<_>>()
            .join("\n");

        fs::write(&self.env_file, content)?;
        Ok(())
    }
}
