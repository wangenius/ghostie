use std::path::Path;
use std::sync::Arc;
use libloading::{Library, Symbol};
use anyhow::{Result, anyhow};

use super::types::Plugin;

/// 插件加载器
pub struct PluginLoader;

type PluginCreate = unsafe fn() -> *mut dyn Plugin;

impl PluginLoader {
    /// 从动态库加载插件
    pub unsafe fn load_plugin_from_lib(lib: Arc<Library>) -> Result<Box<dyn Plugin>> {
        // 获取插件创建函数
        let constructor: Symbol<PluginCreate> = lib.get(b"_plugin_create")
            .map_err(|e| anyhow!("获取插件构造函数失败: {}", e))?;

        // 创建插件实例
        let raw = constructor();
        
        // 将原始指针转换为 Box
        let plugin = Box::from_raw(raw);
        
        // 初始化插件
        plugin.init()?;

        Ok(plugin)
    }
}

/// 插件创建宏
#[macro_export]
macro_rules! declare_plugin {
    ($plugin_type:ty) => {
        #[no_mangle]
        pub extern "C" fn _plugin_create() -> *mut dyn $crate::plugins::Plugin {
            // 创建插件实例
            let plugin = Box::new(<$plugin_type>::default());
            // 将 Box 转换为原始指针
            Box::into_raw(plugin)
        }
    };
} 