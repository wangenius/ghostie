use std::collections::HashMap;
use serde::{Serialize, Deserialize};

/// 插件依赖
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginDependency {
    /// 依赖的插件ID
    pub id: String,
    /// 依赖的版本要求
    pub version_req: String,
    /// 是否为可选依赖
    #[serde(default)]
    pub optional: bool,
}

/// 插件元数据
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginMetadata {
    /// 插件ID
    pub id: String,
    /// 插件名称
    pub name: String,
    /// 插件版本
    pub version: String,
    /// 插件描述
    pub description: String,
    /// 插件作者
    pub author: String,
    /// 插件主页
    #[serde(default)]
    pub homepage: Option<String>,
    /// 插件仓库
    #[serde(default)]
    pub repository: Option<String>,
    /// 插件依赖
    #[serde(default)]
    pub dependencies: Vec<PluginDependency>,
    /// 动态库文件名
    pub library: String,
}

/// 插件配置
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginConfig {
    /// 插件元数据
    pub metadata: PluginMetadata,
    /// 插件是否启用
    #[serde(default)]
    pub enabled: bool,
    /// 插件配置项
    #[serde(default)]
    pub settings: HashMap<String, serde_json::Value>,
}

/// 插件接口
pub trait Plugin: Send + Sync {
    /// 获取插件元数据
    fn metadata(&self) -> &PluginMetadata;
    
    /// 初始化插件
    fn init(&mut self) -> anyhow::Result<()>;
    
    /// 启用插件
    fn enable(&mut self) -> anyhow::Result<()>;
    
    /// 禁用插件
    fn disable(&mut self) -> anyhow::Result<()>;
    
    /// 卸载插件
    fn uninstall(&mut self) -> anyhow::Result<()>;
} 