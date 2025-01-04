// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    Manager, WindowEvent,
};
use tauri_plugin_global_shortcut::{Code, GlobalShortcutExt, Modifiers, Shortcut, ShortcutState};

mod llm;
mod commands;

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    if shortcut
                        == &Shortcut::new(Some(Modifiers::ALT | Modifiers::CONTROL), Code::Space)
                    {
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
            commands::chat,
            commands::set_system_prompt,
            commands::get_system_prompt,
            commands::set_stream_output,
            commands::add_bot,
            commands::remove_bot,
            commands::list_bots,
            commands::set_current_bot,
            commands::get_current_bot,
            commands::set_bot_alias,
            commands::remove_bot_alias,
            commands::list_bot_aliases,
            commands::add_agent,
            commands::remove_agent,
            commands::get_agent,
            commands::execute_agent_command,
        ])
        .setup(|app| {
            let _ = app.handle();
            let shortcut = Shortcut::new(Some(Modifiers::ALT | Modifiers::CONTROL), Code::Space);
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
                .build(app)?;
            Ok(())
        })
        .on_window_event(move |app_handle, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                if let Some(window) = app_handle.get_webview_window("main") {
                    window.hide().unwrap();
                    api.prevent_close();
                }
            }
            if let WindowEvent::Focused(focused) = event {
                if !focused {
                    if let Some(window) = app_handle.get_webview_window("main") {
                        window.hide().unwrap();
                    }
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|_app_handle, event| {
        if let tauri::RunEvent::ExitRequested { api, .. } = event {
            api.prevent_exit();
        }
    });
}
