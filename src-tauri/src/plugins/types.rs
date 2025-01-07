use serde::{Deserialize, Serialize};
/// 插件
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Plugin {
    /// 插件名称
    pub name: String,
    /// 插件描述
    pub description: String,
    /// 插件是否启用
    pub enabled: bool,
    /// 插件脚本内容
    pub script_content: String,
    /// 插件参数
    pub args: Vec<PluginArg>,
}

/// 插件参数
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PluginArg {
    /// 参数名称
    pub name: String,
    /// 参数类型
    pub arg_type: String,
    /// 参数描述
    pub description: String,
    /// 参数是否必填
    pub required: bool,
    /// 参数默认值
    pub default_value: Option<String>,
}
