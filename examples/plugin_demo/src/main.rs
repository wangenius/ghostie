use gascat::plugins::PluginManager;
use anyhow::Result;

#[tokio::main]
async fn main() -> Result<()> {
    // 创建插件管理器
    let manager = PluginManager::new()?;
    
    // 加载所有插件（会自动处理依赖关系）
    manager.load_all_plugins().await?;
    
    // 获取插件
    let format_plugin = manager.get_plugin("format_plugin")
        .expect("格式化插件未加载");
        
    let hello_plugin = manager.get_plugin("hello_plugin")
        .expect("问候插件未加载");
    
    // 使用插件
    // 这里需要进行类型转换才能调用具体插件的方法
    let hello_plugin = unsafe { &*(hello_plugin.as_ref() as *const _ as *const HelloPlugin) };
    println!("{}", hello_plugin.greet("张三", format_plugin.as_ref()));
    
    // 禁用插件（会自动处理依赖关系）
    manager.disable_plugin("hello_plugin").await?;
    manager.disable_plugin("format_plugin").await?;
    
    // 卸载插件（会自动处理依赖关系）
    manager.unregister_plugin("hello_plugin").await?;
    manager.unregister_plugin("format_plugin").await?;
    
    Ok(())
} 