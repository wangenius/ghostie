use serde::{Serialize, Deserialize};
use chrono::{DateTime, Utc};

/// 插件包信息
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginPackage {
    /// 插件元数据
    pub metadata: super::super::types::PluginMetadata,
    /// 下载地址
    pub download_url: String,
    /// 发布时间
    pub published_at: DateTime<Utc>,
    /// 下载次数
    pub downloads: u64,
    /// 评分
    pub rating: f32,
    /// 评分人数
    pub rating_count: u32,
    /// 截图列表
    #[serde(default)]
    pub screenshots: Vec<String>,
    /// 详细描述（支持 Markdown）
    pub description_md: String,
    /// 更新日志（支持 Markdown）
    #[serde(default)]
    pub changelog_md: Option<String>,
    /// SHA256 校验和
    pub sha256: String,
    /// 文件大小（字节）
    pub size: u64,
}

/// 插件市场配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketConfig {
    /// 市场源地址
    pub source_url: String,
    /// 市场名称
    pub name: String,
    /// 市场描述
    pub description: String,
    /// 是否官方市场
    pub official: bool,
    /// 是否启用
    pub enabled: bool,
}

/// 插件评分
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginRating {
    /// 插件ID
    pub plugin_id: String,
    /// 用户ID
    pub user_id: String,
    /// 评分（1-5）
    pub score: u8,
    /// 评论
    pub comment: Option<String>,
    /// 评分时间
    pub created_at: DateTime<Utc>,
}

/// 插件搜索结果
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SearchResult {
    /// 总数
    pub total: u64,
    /// 页码
    pub page: u32,
    /// 每页数量
    pub per_page: u32,
    /// 插件列表
    pub items: Vec<PluginPackage>,
}

/// 插件分类
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginCategory {
    /// 分类ID
    pub id: String,
    /// 分类名称
    pub name: String,
    /// 分类描述
    pub description: String,
    /// 插件数量
    pub plugin_count: u64,
} 