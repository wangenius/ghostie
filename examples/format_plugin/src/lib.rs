use gascat::plugins::{Plugin, PluginMetadata};
use gascat::declare_plugin;
use anyhow::Result;

#[derive(Default)]
pub struct FormatPlugin {
    metadata: PluginMetadata,
}

impl FormatPlugin {
    fn new() -> Self {
        Self {
            metadata: PluginMetadata {
                id: "format_plugin".to_string(),
                name: "格式化插件".to_string(),
                version: "0.1.0".to_string(),
                description: "提供文本格式化功能".to_string(),
                author: "GasCat".to_string(),
                homepage: None,
                repository: None,
                dependencies: vec![],
                library: "libformat_plugin.dll".to_string(),
            }
        }
    }

    pub fn format_text(&self, text: &str) -> String {
        text.to_uppercase()
    }
}

impl Plugin for FormatPlugin {
    fn metadata(&self) -> &PluginMetadata {
        &self.metadata
    }
    
    fn init(&mut self) -> Result<()> {
        println!("格式化插件初始化中...");
        Ok(())
    }
    
    fn enable(&mut self) -> Result<()> {
        println!("格式化插件已启用");
        Ok(())
    }
    
    fn disable(&mut self) -> Result<()> {
        println!("格式化插件已禁用");
        Ok(())
    }
    
    fn uninstall(&mut self) -> Result<()> {
        println!("格式化插件正在卸载...");
        Ok(())
    }
}

declare_plugin!(FormatPlugin); 