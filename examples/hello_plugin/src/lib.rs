use gascat::plugins::{Plugin, PluginMetadata, PluginDependency};
use gascat::declare_plugin;
use anyhow::Result;

#[derive(Default)]
pub struct HelloPlugin {
    metadata: PluginMetadata,
}

impl HelloPlugin {
    fn new() -> Self {
        Self {
            metadata: PluginMetadata {
                id: "hello_plugin".to_string(),
                name: "问候插件".to_string(),
                version: "0.1.0".to_string(),
                description: "一个简单的问候插件示例".to_string(),
                author: "GasCat".to_string(),
                homepage: Some("https://github.com/your/hello_plugin".to_string()),
                repository: Some("https://github.com/your/hello_plugin".to_string()),
                dependencies: vec![
                    PluginDependency {
                        id: "format_plugin".to_string(),
                        version_req: "^0.1.0".to_string(),
                        optional: false,
                    }
                ],
                library: "libhello_plugin.dll".to_string(),
            }
        }
    }

    pub fn greet(&self, name: &str, format_plugin: &dyn Plugin) -> String {
        // 将 format_plugin 转换为具体类型
        let format_plugin = unsafe { &*(format_plugin as *const _ as *const FormatPlugin) };
        let formatted_name = format_plugin.format_text(name);
        format!("你好, {}! 我是问候插件.", formatted_name)
    }
}

impl Plugin for HelloPlugin {
    fn metadata(&self) -> &PluginMetadata {
        &self.metadata
    }
    
    fn init(&mut self) -> Result<()> {
        println!("问候插件初始化中...");
        Ok(())
    }
    
    fn enable(&mut self) -> Result<()> {
        println!("问候插件已启用");
        Ok(())
    }
    
    fn disable(&mut self) -> Result<()> {
        println!("问候插件已禁用");
        Ok(())
    }
    
    fn uninstall(&mut self) -> Result<()> {
        println!("问候插件正在卸载...");
        Ok(())
    }
}

declare_plugin!(HelloPlugin); 