// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::atomic::{AtomicI64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};
use tauri_plugin_updater::UpdaterExt;

mod commands;
mod llm;

static LAST_WINDOW_ACTION: AtomicI64 = AtomicI64::new(0);

#[tauri::command]
async fn check_update(app: tauri::AppHandle) -> Result<bool, String> {
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(update) => Ok(update.is_some()),
            Err(e) => Err(e.to_string()),
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn install_update(app: tauri::AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;
    let update = updater.check().await.map_err(|e| e.to_string())?;

    if let Some(update) = update {
        let mut downloaded = 0;
        let progress = move |chunk_length: usize, content_length: Option<u64>| {
            downloaded += chunk_length;
            println!("已下载 {downloaded} / {content_length:?}");
        };
        let finished = || println!("下载完成");

        update
            .download_and_install(progress, finished)
            .await
            .map_err(|e| e.to_string())?;

        println!("更新已安装");
        app.restart();
    }

    Ok(())
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_log::Builder::default().build())
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
                    if shortcut == &Shortcut::new(Some(Modifiers::ALT), Code::Space) {
                        if matches!(event.state(), ShortcutState::Pressed) {
                            if let Some(window) = app.get_webview_window("main") {
                                if window.is_visible().unwrap() {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::add_model,
            commands::remove_model,
            commands::list_models,
            commands::set_current_model,
            commands::update_model,
            commands::get_model,
            commands::chat,
            commands::set_system_prompt,
            commands::get_system_prompt,
            commands::set_stream_output,
            commands::add_bot,
            commands::remove_bot,
            commands::list_bots,
            commands::set_current_bot,
            commands::get_current_bot,
            commands::update_bot,
            commands::get_bot,
            commands::add_agent,
            commands::remove_agent,
            commands::execute_agent_command,
            commands::create_chat_history,
            commands::update_chat_history,
            commands::list_histories,
            commands::delete_history,
            commands::open_window,
            commands::open_window_with_query,
            commands::hide_window,
            commands::list_agents,
            commands::get_agent,
            commands::update_agent,
            commands::execute_agent_command,
            check_update,
            install_update,
        ])
        .setup(|app| {
            let _ = app.handle();
            let shortcut = Shortcut::new(Some(Modifiers::ALT), Code::Space);
            app.global_shortcut().register(shortcut)?;

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
                .on_menu_event(move |app, event| {
                    if let Some(window) = app.get_webview_window("main") {
                        match event.id().as_ref() {
                            "quit" => std::process::exit(0),
                            "show" => {
                                window.show().unwrap();
                                window.set_focus().unwrap();
                            }
                            "hide" => {
                                window.hide().unwrap();
                            }
                            _ => {}
                        }
                    }
                })
                .tooltip("echo智能助手")
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let Some(window) = tray.app_handle().get_webview_window("main") {
                        match event {
                            tauri::tray::TrayIconEvent::Click {
                                button: tauri::tray::MouseButton::Left,
                                ..
                            } => {
                                let now = SystemTime::now()
                                    .duration_since(UNIX_EPOCH)
                                    .unwrap()
                                    .as_millis() as i64;
                                let last = LAST_WINDOW_ACTION.load(Ordering::SeqCst);

                                if now - last < 500 {
                                    return;
                                }

                                LAST_WINDOW_ACTION.store(now, Ordering::SeqCst);

                                let visible = window.is_visible().unwrap();
                                if visible {
                                    let _ = window.hide();
                                } else {
                                    let _ = window.show();
                                    let _ = window.set_focus();
                                }
                            }
                            tauri::tray::TrayIconEvent::Click {
                                button: tauri::tray::MouseButton::Right,
                                ..
                            } => {
                                // 在 Tauri 2.0 中，菜单会自动显示，不需要手动调用
                            }
                            _ => {}
                        }
                    }
                })
                .build(app)?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| match event {
        tauri::RunEvent::ExitRequested { api, .. } => {
            api.prevent_exit();
        }
        tauri::RunEvent::Ready => {
            if let Some(window) = app_handle.get_webview_window("main") {
                let window_handle = window.clone();
                window.on_window_event(move |event| match event {
                    WindowEvent::CloseRequested { api, .. } => {
                        let _ = window_handle.hide();
                        api.prevent_close();
                    }
                    _ => {}
                });
            }
        }
        _ => {}
    });
}
