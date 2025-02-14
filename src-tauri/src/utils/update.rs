use tauri::AppHandle;
use tauri_plugin_updater::UpdaterExt;
#[tauri::command]
pub async fn check_update(app: AppHandle) -> Result<bool, String> {
    match app.updater() {
        Ok(updater) => match updater.check().await {
            Ok(update) => Ok(update.is_some()),
            Err(e) => Err(e.to_string()),
        },
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
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
