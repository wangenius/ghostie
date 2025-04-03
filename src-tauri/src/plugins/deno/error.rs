use serde::Serialize;
use thiserror::Error;

#[derive(Error, Debug, Serialize)]
pub enum PluginError {
    #[error("IO错误: {0}")]
    Io(String),
    #[error("Deno未安装")]
    DenoNotInstalled,
    #[error("JSON错误: {0}")]
    Json(String),
    #[error("TOML错误: {0}")]
    Toml(String),
    #[error("插件错误: {0}")]
    Plugin(String),
    #[error("执行超时")]
    Timeout,
    #[error("插件不存在: {0}")]
    NotFound(String),
}

impl From<std::io::Error> for PluginError {
    fn from(err: std::io::Error) -> Self {
        PluginError::Io(err.to_string())
    }
}

impl From<serde_json::Error> for PluginError {
    fn from(err: serde_json::Error) -> Self {
        PluginError::Json(err.to_string())
    }
}

impl From<toml::ser::Error> for PluginError {
    fn from(err: toml::ser::Error) -> Self {
        PluginError::Toml(err.to_string())
    }
}

impl From<toml::de::Error> for PluginError {
    fn from(err: toml::de::Error) -> Self {
        PluginError::Toml(err.to_string())
    }
}

impl From<String> for PluginError {
    fn from(err: String) -> Self {
        PluginError::Plugin(err)
    }
}

impl<'a> From<&'a str> for PluginError {
    fn from(err: &'a str) -> Self {
        PluginError::Plugin(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, PluginError>; 