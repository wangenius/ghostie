import { app } from "electron";
import { autoUpdater } from "electron-updater";

/**
 * 应用管理类
 * 负责应用的更新、退出等核心功能
 */
export class App {
    /**
     * 设置自动更新配置
     */
    static setAutoUpdate(): void {
        // 设置自动更新
        autoUpdater.autoDownload = false;
        autoUpdater.autoInstallOnAppQuit = true;
    }

    /**
     * 检查应用更新
     * @param silent 是否静默检查，静默模式下不会显示通知
     */
    static checkUpdate(silent: boolean = false): void {
        // 检查更新
        if (silent) {
            autoUpdater.checkForUpdates().catch(console.error);
        } else {
            autoUpdater.checkForUpdatesAndNotify().catch(console.error);
        }
    }

    /**
     * 退出应用
     */
    static exit(): void {
        // 在 macOS 上，确保应用完全退出
        if (process.platform === "darwin") {
            // 强制退出所有窗口
            app.exit(0);
        } else {
            app.quit();
        }
    }

    /**
     * 隐藏应用（仅适用于 macOS）
     */
    static hide(): void {
        if (process.platform === "darwin") {
            app.hide();
        }
    }

    /**
     * 显示应用（仅适用于 macOS）
     */
    static show(): void {
        if (process.platform === "darwin") {
            app.show();
        }
    }
} 