use std::path::Path;
use anyhow::{Result, anyhow};
use reqwest::Client;
use sha2::{Sha256, Digest};
use tokio::fs;
use futures_util::StreamExt;
use super::types::*;

/// 插件市场客户端
pub struct MarketClient {
    /// HTTP 客户端
    client: Client,
    /// 市场配置
    config: MarketConfig,
}

impl MarketClient {
    /// 创建新的市场客户端
    pub fn new(config: MarketConfig) -> Self {
        Self {
            client: Client::new(),
            config,
        }
    }
    
    /// 搜索插件
    pub async fn search(&self, query: &str, page: u32, per_page: u32) -> Result<SearchResult> {
        let url = format!(
            "{}/api/plugins/search?q={}&page={}&per_page={}",
            self.config.source_url,
            query,
            page,
            per_page
        );
        
        let response = self.client.get(&url)
            .send()
            .await?
            .error_for_status()?;
            
        let result = response.json::<SearchResult>().await?;
        Ok(result)
    }
    
    /// 获取插件详情
    pub async fn get_plugin(&self, id: &str) -> Result<PluginPackage> {
        let url = format!(
            "{}/api/plugins/{}",
            self.config.source_url,
            id
        );
        
        let response = self.client.get(&url)
            .send()
            .await?
            .error_for_status()?;
            
        let plugin = response.json::<PluginPackage>().await?;
        Ok(plugin)
    }
    
    /// 获取插件分类列表
    pub async fn get_categories(&self) -> Result<Vec<PluginCategory>> {
        let url = format!("{}/api/categories", self.config.source_url);
        
        let response = self.client.get(&url)
            .send()
            .await?
            .error_for_status()?;
            
        let categories = response.json::<Vec<PluginCategory>>().await?;
        Ok(categories)
    }
    
    /// 获取分类下的插件
    pub async fn get_plugins_by_category(&self, category_id: &str, page: u32, per_page: u32) -> Result<SearchResult> {
        let url = format!(
            "{}/api/categories/{}/plugins?page={}&per_page={}",
            self.config.source_url,
            category_id,
            page,
            per_page
        );
        
        let response = self.client.get(&url)
            .send()
            .await?
            .error_for_status()?;
            
        let result = response.json::<SearchResult>().await?;
        Ok(result)
    }
    
    /// 下载插件
    pub async fn download_plugin(&self, package: &PluginPackage, target_dir: &Path) -> Result<()> {
        // 创建临时文件
        let temp_path = target_dir.join(format!("{}.tmp", package.metadata.id));
        
        // 开始下载
        let mut response = self.client.get(&package.download_url)
            .send()
            .await?
            .error_for_status()?;
            
        let mut file = fs::File::create(&temp_path).await?;
        let mut hasher = Sha256::new();
        let mut downloaded: u64 = 0;
        
        while let Some(chunk) = response.chunk().await? {
            hasher.update(&chunk);
            fs::write(&mut file, &chunk).await?;
            downloaded += chunk.len() as u64;
            
            // 检查下载进度
            if downloaded > package.size {
                fs::remove_file(&temp_path).await?;
                return Err(anyhow!("文件大小超出预期"));
            }
        }
        
        // 验证文件大小
        if downloaded != package.size {
            fs::remove_file(&temp_path).await?;
            return Err(anyhow!("文件大小不匹配"));
        }
        
        // 验证校验和
        let hash = format!("{:x}", hasher.finalize());
        if hash != package.sha256 {
            fs::remove_file(&temp_path).await?;
            return Err(anyhow!("文件校验和不匹配"));
        }
        
        // 移动到最终位置
        let final_path = target_dir.join(&package.metadata.library);
        fs::rename(temp_path, final_path).await?;
        
        Ok(())
    }
    
    /// 提交评分
    pub async fn submit_rating(&self, rating: PluginRating) -> Result<()> {
        let url = format!(
            "{}/api/plugins/{}/ratings",
            self.config.source_url,
            rating.plugin_id
        );
        
        self.client.post(&url)
            .json(&rating)
            .send()
            .await?
            .error_for_status()?;
            
        Ok(())
    }
    
    /// 获取插件评分列表
    pub async fn get_ratings(&self, plugin_id: &str, page: u32, per_page: u32) -> Result<Vec<PluginRating>> {
        let url = format!(
            "{}/api/plugins/{}/ratings?page={}&per_page={}",
            self.config.source_url,
            plugin_id,
            page,
            per_page
        );
        
        let response = self.client.get(&url)
            .send()
            .await?
            .error_for_status()?;
            
        let ratings = response.json::<Vec<PluginRating>>().await?;
        Ok(ratings)
    }
} 