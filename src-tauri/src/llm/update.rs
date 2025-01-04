use anyhow::Result;
use reqwest;
use std::fs;

const RELEASES_URL: &str = "https://api.github.com/repos/wangenius/gpt-shell/releases/latest";
const CURRENT_VERSION: &str = env!("CARGO_PKG_VERSION");

pub struct Update;

impl Update {
    /// 检查是否有新版本可用
    /// 返回新版本号(如果有)或 None(如果已是最新版本)
    pub async fn check_update() -> Result<Option<String>> {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()?;
        let releases_url = RELEASES_URL.to_string();
        let mut retries = 3;
        let mut last_error = None;

        while retries > 0 {
            match client
                .get(&releases_url)
                .header("User-Agent", "gpt-shell")
                .send()
                .await
            {
                Ok(response) => {
                    if response.status().is_success() {
                        match response.json::<serde_json::Value>().await {
                            Ok(release) => {
                                if let Some(tag_name) = release["tag_name"].as_str() {
                                    let latest_version = tag_name.trim_start_matches('v');
                                    if latest_version != CURRENT_VERSION {
                                        return Ok(Some(latest_version.to_string()));
                                    }
                                    return Ok(None);
                                }
                                return Err(anyhow::anyhow!("invalid release format"));
                            }
                            Err(e) => {
                                last_error = Some(format!("parse response failed: {}", e));
                            }
                        }
                    } else if response.status() == reqwest::StatusCode::NOT_FOUND {
                        return Ok(None);
                    } else {
                        last_error = Some(format!(
                            "API request failed, status code: {}",
                            response.status()
                        ));
                    }
                }
                Err(e) => {
                    last_error = Some(format!("network request failed: {}", e));
                }
            }

            retries -= 1;
            if retries > 0 {
                tokio::time::sleep(std::time::Duration::from_secs(1)).await;
            }
        }

        Err(anyhow::anyhow!(
            "check update failed: {}",
            last_error.unwrap_or_else(|| "unknown error".to_string())
        ))
    }
    /// 下载并替换当前程序为新版本
    /// version: 要更新到的版本号
    pub async fn download_and_replace(_version: &str) -> Result<()> {
        let client = reqwest::Client::new();

        let response = client
            .get(RELEASES_URL)
            .header("User-Agent", "gpt-shell")
            .send()
            .await?;

        let release: serde_json::Value = response.json().await?;
        let assets = release["assets"]
            .as_array()
            .ok_or_else(|| anyhow::anyhow!("No assets found"))?;

        // 根据操作系统选择正确的资产
        let asset_name = if cfg!(target_os = "windows") {
            "gpt-windows-amd64.exe"
        } else if cfg!(target_os = "macos") {
            "gpt-macos-amd64"
        } else {
            "gpt-linux-amd64"
        };

        let download_url = assets
            .iter()
            .find(|asset| asset["name"].as_str() == Some(asset_name))
            .and_then(|asset| asset["browser_download_url"].as_str())
            .ok_or_else(|| anyhow::anyhow!("Asset not found"))?;

        println!("Downloading update...");

        let response = client
            .get(download_url)
            .header("User-Agent", "gpt-shell")
            .send()
            .await?;

        let bytes = response.bytes().await?;

        // 获取当前可执行文件的路径
        let current_exe = std::env::current_exe()?;
        let backup_path = current_exe.with_extension("old");

        // 备份当前可执行文件
        if fs::rename(&current_exe, &backup_path).is_err() {
            println!("Failed to create backup, skipping...");
        }

        // 写入新的可执行文件
        fs::write(&current_exe, bytes)?;

        // 设置执行权限（在Unix系统上）
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mut perms = fs::metadata(&current_exe)?.permissions();
            perms.set_mode(0o755);
            fs::set_permissions(&current_exe, perms)?;
        }

        println!("Update completed successfully!");
        println!("Please restart gpt-shell to use the new version.");

        Ok(())
    }
}
