use serde::{Serialize, Deserialize};

/// JavaScript 插件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct JsPlugin {
    /// 插件名称
    pub name: String,
    /// 插件描述
    #[serde(default)]
    pub description: Option<String>,
    /// 插件脚本内容
    pub script_content: String,
    /// 是否启用
    #[serde(default)]
    pub enabled: bool,
} 