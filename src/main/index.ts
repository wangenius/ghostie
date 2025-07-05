import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import { app, BrowserWindow, globalShortcut, Menu, nativeImage, shell, Tray } from "electron";
import { join } from "path";
import { App } from "./app/App";
import { Settings } from "./app/Settings";
import { ipc_handles } from "./ipc";
import { User } from "./user/User";

/**
 * 主窗口实例
 */
export let mainWindow: BrowserWindow | null = null;

/**
 * 系统托盘实例
 */
let tray: Tray | null = null;

/**
 * 全局状态管理
 */
export const ProgressState = {
    /** 是否允许退出应用 */
    isShutdown: false,
    /** 是否静默检查更新 */
    silentUpdate: false
};

/**
 * 窗口配置常量
 */
const WINDOW_CONFIG = {
    width: 1200,
    height: 800,
    minHeight: 800,
    minWidth: 1200,
    show: false,
    webPreferences: {
        preload: join(__dirname, "../preload/index.js"),
        sandbox: false,
        contextIsolation: true,
        nodeIntegration: false
    }
};

/**
 * 创建主窗口
 * @returns Promise<BrowserWindow> 返回创建的窗口实例
 */
async function createWindow(): Promise<BrowserWindow> {
    try {
        const taskbarIcon = nativeImage.createFromPath(join(__dirname, "../../resources/icon.png"));
        const alwaysOnTop = await Settings.get("alwaysOnTop");

        // 获取并设置主题
        const theme = (await Settings.get("theme")) || "light";

        mainWindow = new BrowserWindow({
            ...WINDOW_CONFIG,
            icon: taskbarIcon,
            alwaysOnTop
        });

        // 在加载页面之前设置主题
        mainWindow.webContents.on("dom-ready", () => {
            mainWindow?.webContents.executeJavaScript(`
                document.documentElement.setAttribute("data-theme", "${theme}");
            `);
        });

        mainWindow.on("ready-to-show", () => {
            mainWindow?.show();
        });

        mainWindow.webContents.setWindowOpenHandler((details) => {
            void shell.openExternal(details.url);
            return { action: "deny" };
        });

        if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
            await mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]);
        } else {
            await mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
        }

        setupWindowEvents(mainWindow);

        return mainWindow;
    } catch (error) {
        console.error("创建窗口失败:", error);
        throw error;
    }
}

/**
 * 设置窗口事件监听
 * @param window 要设置事件的窗口实例
 */
function setupWindowEvents(window: BrowserWindow): void {
    window.on("close", (event) => {
        if (!ProgressState.isShutdown) {
            event.preventDefault();
            hideWindow();
        }
    });
}

/**
 * 创建系统托盘
 * @param window 主窗口实例
 */
function createTray(window: BrowserWindow): void {
    const iconPath = join(__dirname, "../../resources/icon.png");
    const trayIcon = nativeImage.createFromPath(iconPath);

    tray = new Tray(trayIcon);

    const contextMenu = Menu.buildFromTemplate([
        {
            label: "显示",
            click: () => window.show()
        },
        {
            label: "隐藏",
            click: () => hideWindow()
        },
        {
            label: "退出",
            click: () => App.exit()
        }
    ]);

    tray.setToolTip("Ghostie\nAI 助手");
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => window.show());
}

/**
 * 设置全局快捷键
 */
function setupGlobalShortcuts(): void {
    // Alt + Space 切换窗口显示/隐藏
    globalShortcut.register("Alt+Space", () => {
        if (mainWindow) {
            if (mainWindow.isVisible()) {
                mainWindow.hide();
            } else {
                mainWindow.show();
                mainWindow.focus();
            }
        }
    });
}

/**
 * 设置平台特定的配置
 */
function setupPlatformSpecific(): void {
    if (process.platform === "darwin") {
        const iconPath = nativeImage.createFromPath(join(__dirname, "../../resources/icon.icns"));
        app.dock.setIcon(iconPath);
    } else if (process.platform === "win32") {
        app.setAppUserModelId(process.execPath);
    }
}

/**
 * 设置 IPC 处理器
 */
async function setupIPCHandlers(): Promise<void> {
    ipc_handles();
}

/**
 * 设置窗口置顶状态
 */
async function setupAlwaysOnTop(): Promise<void> {
    try {
        const alwaysOnTop = await Settings.get("alwaysOnTop");
        mainWindow?.setAlwaysOnTop(alwaysOnTop ?? false);
    } catch (error) {
        console.error("设置窗口置顶状态失败:", error);
        mainWindow?.setAlwaysOnTop(false);
    }
}

/**
 * 隐藏主窗口
 */
function hideWindow() {
    mainWindow?.hide();
}

/**
 * 应用初始化
 */
app.whenReady().then(async () => {
    try {
        App.setAutoUpdate();
        setupPlatformSpecific();
        electronApp.setAppUserModelId("com.wangenius.ghostie");

        app.on("browser-window-created", (_, window) => {
            optimizer.watchWindowShortcuts(window);
        });

        App.checkUpdate(true);

        await setupIPCHandlers();
        const window = await createWindow();
        await setupAlwaysOnTop();
        setupGlobalShortcuts();
        User.checkout();
        createTray(window);
    } catch (error) {
        console.error("应用初始化失败:", error);
        if (!mainWindow?.isDestroyed()) {
            app.quit();
        }
    }
});

/**
 * 所有窗口关闭时的处理
 */
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

/**
 * 应用退出前清理全局快捷键
 */
app.on("will-quit", () => {
    globalShortcut.unregisterAll();
}); 