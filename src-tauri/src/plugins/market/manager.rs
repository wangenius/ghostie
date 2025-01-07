use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use anyhow::{Result, anyhow};
use tokio::fs;
use tokio::sync::RwLock;

use super::types::*;
use super::client::MarketClient;
use crate::llm::utils;

/// 插件市场管理器
pub struct MarketManager {
    /// 市场客户端列表
    markets: RwLock<HashMap<String, Arc<MarketClient>>>,
    /// 插件目录
    plugins_dir: PathBuf,
}

impl MarketManager {
    /// 创建新的市场管理器
    pub fn new() -> Result<Self> {
        let app_dir = utils::get_config_dir().expect("Failed to get config directory");
        let plugins_dir = app_dir.join("plugins");
        
        Ok(Self {
            markets: RwLock::new(HashMap::new()),
            plugins_dir,
        })
    }
    
    /// 加载市场配置
    pub async fn load_markets(&self) -> Result<()> {
        let config_dir = self.plugins_dir.join("markets");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).await?;
            
            // 创建默认官方市场配置
            let official_market = MarketConfig {
                source_url: "https://plugins.gascat.com".to_string(),
                name: "GasCat 官方插件市场".to_string(),
                description: "GasCat 官方提供的插件市场".to_string(),
                official: true,
                enabled: true,
            };
            
            self.save_market_config(&official_market).await?;
        }
        
        let mut entries = fs::read_dir(&config_dir).await?;
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("yml") {
                if let Ok(config) = self.load_market_config(&path).await {
                    if config.enabled {
                        let client = Arc::new(MarketClient::new(config));
                        self.markets.write().await.insert(client.config.name.clone(), client);
                    }
                }
            }
        }
        
        Ok(())
    }
    
    /// 从文件加载市场配置
    async fn load_market_config<P: AsRef<std::path::Path>>(&self, path: P) -> Result<MarketConfig> {
        let contents = fs::read_to_string(path).await?;
        let config: MarketConfig = serde_yaml::from_str(&contents)?;
        Ok(config)
    }
    
    /// 保存市场配置
    async fn save_market_config(&self, config: &MarketConfig) -> Result<()> {
        let config_dir = self.plugins_dir.join("markets");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).await?;
        }
        
        let yaml = serde_yaml::to_string(config)?;
        let file_name = config.name.to_lowercase().replace(" ", "_");
        let file_path = config_dir.join(format!("{}.yml", file_name));
        fs::write(file_path, yaml).await?;
        
        Ok(())
    }
    
    /// 添加新的市场
    pub async fn add_market(&self, config: MarketConfig) -> Result<()> {
        // 保存配置
        self.save_market_config(&config).await?;
        
        if config.enabled {
            // 创建客户端
            let client = Arc::new(MarketClient::new(config));
            self.markets.write().await.insert(client.config.name.clone(), client);
        }
        
        Ok(())
    }
    
    /// 移除市场
    pub async fn remove_market(&self, name: &str) -> Result<()> {
        // 移除配置文件
        let config_dir = self.plugins_dir.join("markets");
        let file_name = name.to_lowercase().replace(" ", "_");
        let file_path = config_dir.join(format!("{}.yml", file_name));
        
        if file_path.exists() {
            fs::remove_file(file_path).await?;
        }
        
        // 移除客户端
        self.markets.write().await.remove(name);
        
        Ok(())
    }
    
    /// 搜索插件
    pub async fn search_plugins(&self, query: &str, page: u32, per_page: u32) -> Result<Vec<SearchResult>> {
        let markets = self.markets.read().await;
        let mut results = Vec::new();
        
        for client in markets.values() {
            if let Ok(result) = client.search(query, page, per_page).await {
                results.push(result);
            }
        }
        
        Ok(results)
    }
    
    /// 安装插件
    pub async fn install_plugin(&self, market_name: &str, plugin_id: &str) -> Result<()> {
        let markets = self.markets.read().await;
        let client = markets.get(market_name)
            .ok_or_else(|| anyhow!("市场不存在: {}", market_name))?;
            
        // 获取插件信息
        let package = client.get_plugin(plugin_id).await?;
        
        // 下载插件
        let libs_dir = self.plugins_dir.join("libs");
        if !libs_dir.exists() {
            fs::create_dir_all(&libs_dir).await?;
        }
        
        client.download_plugin(&package, &libs_dir).await?;
        
        // 保存插件配置
        let config = super::super::types::PluginConfig {
            metadata: package.metadata,
            enabled: true,
            settings: HashMap::new(),
        };
        
        let config_dir = self.plugins_dir.join("configs");
        if !config_dir.exists() {
            fs::create_dir_all(&config_dir).await?;
        }
        
        let yaml = serde_yaml::to_string(&config)?;
        let file_path = config_dir.join(format!("{}.yml", config.metadata.id));
        fs::write(file_path, yaml).await?;
        
        Ok(())
    }
    
    /// 获取市场列表
    pub async fn list_markets(&self) -> Vec<MarketConfig> {
        self.markets.read().await
            .values()
            .map(|client| client.config.clone())
            .collect()
    }
    
    /// 获取插件分类列表
    pub async fn get_categories(&self, market_name: &str) -> Result<Vec<PluginCategory>> {
        let markets = self.markets.read().await;
        let client = markets.get(market_name)
            .ok_or_else(|| anyhow!("市场不存在: {}", market_name))?;
            
        client.get_categories().await
    }
    
    /// 获取分类下的插件
    pub async fn get_plugins_by_category(&self, market_name: &str, category_id: &str, page: u32, per_page: u32) -> Result<SearchResult> {
        let markets = self.markets.read().await;
        let client = markets.get(market_name)
            .ok_or_else(|| anyhow!("市场不存在: {}", market_name))?;
            
        client.get_plugins_by_category(category_id, page, per_page).await
    }
    
    /// 提交插件评分
    pub async fn submit_rating(&self, market_name: &str, rating: PluginRating) -> Result<()> {
        let markets = self.markets.read().await;
        let client = markets.get(market_name)
            .ok_or_else(|| anyhow!("市场不存在: {}", market_name))?;
            
        client.submit_rating(rating).await
    }
    
    /// 获取插件评分列表
    pub async fn get_ratings(&self, market_name: &str, plugin_id: &str, page: u32, per_page: u32) -> Result<Vec<PluginRating>> {
        let markets = self.markets.read().await;
        let client = markets.get(market_name)
            .ok_or_else(|| anyhow!("市场不存在: {}", market_name))?;
            
        client.get_ratings(plugin_id, page, per_page).await
    }
} 