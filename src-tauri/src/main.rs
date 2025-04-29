// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use ghostie::plugins::{chat, mcp, node};
use ghostie::utils;
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

#[tokio::main]
async fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_global_shortcut::Builder::default().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_updater::Builder::default().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut == &Shortcut::new(Some(Modifiers::ALT), Code::Space)
                        && matches!(event.state(), ShortcutState::Pressed)
                    {
                        if let Some(window) = app.get_webview_window("main") {
                            if window.is_visible().unwrap() {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
                .build(),
        )
        .setup(|app| {
            // 初始化 Deno 插件管理器
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = node::init().await {
                    eprintln!("初始化 Node 插件管理器失败: {}", e);
                }
                node::set_app_handle(app_handle).await;
            });

            // 初始化 MCP 插件管理器
            tauri::async_runtime::spawn(async move {
                if let Err(e) = mcp::init().await {
                    eprintln!("初始化 MCP 插件管理器失败: {}", e);
                }
            });

            // 仅在桌面平台启用自动更新功能
            #[cfg(desktop)]
            let _ = app
                .handle()
                .plugin(tauri_plugin_updater::Builder::new().build());

            // 仅在桌面平台启用自动启动功能
            // 配置为在系统启动时自动运行应用，使用 LaunchAgent（macOS），并传入启动参数
            #[cfg(desktop)]
            let _ = app.handle().plugin(tauri_plugin_autostart::init(
                tauri_plugin_autostart::MacosLauncher::LaunchAgent,
                Some(vec!["--flag1", "--flag2"]),
            ));

            // 注册快捷键
            let _ = app.handle();
            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            app.global_shortcut().register(shortcut)?;

            // 创建托盘图标
            let menu = Menu::with_items(
                app,
                &[
                    &MenuItem::with_id(app, "show", "显示", true, None::<&str>)?,
                    &MenuItem::with_id(app, "hide", "隐藏", true, None::<&str>)?,
                    &MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?,
                ],
            )?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| {
                    if let Some(window) = app.get_webview_window("main") {
                        match event.id().as_ref() {
                            "quit" => {
                                app.exit(0);
                            }
                            "show" => {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                            "hide" => {
                                let _ = window.hide();
                            }
                            _ => {}
                        }
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        match event {
                            tauri::tray::TrayIconEvent::Click { button, .. } => {
                                if button == tauri::tray::MouseButton::Left {
                                    // 左键单击显示窗口
                                    let _ = window.set_focus();
                                    let _ = window.show();
                                }
                            }
                            _ => {}
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        // 启用系统对话框插件
        .invoke_handler(tauri::generate_handler![
            chat::chat_stream,
            chat::cancel_stream,
            chat::image_result,
            chat::image_generate,
            utils::file::open_files_path,
            utils::file::open_file,
            utils::file::save_file,
            utils::file::read_file_text,
            utils::file::get_file_drop_list,
            utils::file::read_file,
            utils::file::write_file,
            utils::window::open_config_dir,
            node::plugin_execute,
            node::env_list,
            node::env_save,
            node::node_install,
            node::node_check,
            node::node_list_dependencies,
            node::node_install_dependency,
            node::node_update_dependencies,
            node::node_uninstall_dependency,
            utils::window::open_url,
            utils::window::notify,
            mcp::start_service,
            mcp::stop_service,
            mcp::get_service_info,
            mcp::call_tool,
            node::code_plugins,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        if let tauri::RunEvent::WindowEvent {
            label,
            event: tauri::WindowEvent::CloseRequested { api, .. },
            ..
        } = event
        {
            if label == "main" {
                if let Some(window) = app.get_webview_window("main") {
                    if window.is_visible().unwrap_or(false) {
                        api.prevent_close();
                        let _ = window.hide();
                    }
                }
            }
        }
    });
}
