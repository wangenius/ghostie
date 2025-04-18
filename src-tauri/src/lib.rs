// 导入模块
pub mod plugins;
pub mod utils;

// 定义应用程序的主入口函数
// cfg_attr 是条件编译属性，在移动平台上使用 tauri::mobile_entry_point
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 创建默认的 Tauri 应用程序构建器
    tauri::Builder::default()
        .setup(|app| {
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;
            Ok(())
        })
        // 运行应用程序
        // generate_context! 宏用于生成应用程序上下文
        .run(tauri::generate_context!())
        // 处理运行时可能出现的错误
        .expect("error while running tauri application");
}
