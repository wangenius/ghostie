import { electronApp, is, optimizer } from "@electron-toolkit/utils";
import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  shell,
  Tray,
} from "electron";
import { join } from "path";
import { App } from "./app/App";
import { Settings } from "./app/Settings";
import { ipc_handles } from "./ipc";
import { User } from "./user/User";
import { SETTINGS_NAV_ITEMS } from "../common/config/nav";
import { AgentIpcManager } from "./agent/AgentIpcManager";

// 导入模型提供商和引擎模式
import "./model/chat/provider";
import "./model/image/provider";
import "./model/audio/provider";
import "./model/vision/provider";
import "./model/embedding/provider";
import "./agent/engine/mode";

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
  silentUpdate: false,
};

/**
 * 窗口配置常量
 */
const WINDOW_CONFIG = {
  width: 800,
  height: 800,
  minHeight: 800,
  minWidth: 800,
  show: false,
  frame: true,
  titleBarStyle: "hidden",
  webPreferences: {
    preload: join(__dirname, "../preload/index.js"),
    sandbox: false,
    contextIsolation: true,
    nodeIntegration: false,
  },
};

/**
 * 创建主窗口
 * @returns Promise<BrowserWindow> 返回创建的窗口实例
 */
async function createWindow(): Promise<BrowserWindow> {
  try {
    // 兼容开发和生产环境
    let taskbarIconPath: string;
    if (app.isPackaged) {
      taskbarIconPath = join(process.resourcesPath, "icon.icns");
    } else {
      taskbarIconPath = join(process.cwd(), "resources/icon-macoOS-dock.png");
    }
    console.log("尝试加载任务栏图标，路径:", taskbarIconPath);
    const taskbarIcon = nativeImage.createFromPath(taskbarIconPath);
    const alwaysOnTop = await Settings.get("alwaysOnTop");

    // 获取并设置主题
    const theme = (await Settings.get("theme")) || "light";

    mainWindow = new BrowserWindow({
      ...WINDOW_CONFIG,
      icon: taskbarIcon,
      titleBarStyle: "hiddenInset",
      alwaysOnTop,
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
    // macOS 上，如果用户点击关闭按钮，应该完全退出应用
    // 而不是隐藏到托盘
    if (process.platform === "darwin") {
      // 在 macOS 上，直接退出应用
      ProgressState.isShutdown = true;
      app.quit();
    } else {
      // 在 Windows/Linux 上，隐藏到托盘
      if (!ProgressState.isShutdown) {
        event.preventDefault();
        hideWindow();
      }
    }
  });

  // 处理窗口被销毁的情况
  window.on("closed", () => {
    mainWindow = null;
  });
}

/**
 * 创建系统托盘
 * @param window 主窗口实例
 */
function createTray(window: BrowserWindow): void {
  // 在 macOS 上不创建系统托盘，因为 macOS 使用 Dock
  if (process.platform === "darwin") {
    return;
  }

  // 兼容开发和生产环境
  let iconPath: string;
  if (app.isPackaged) {
    iconPath = join(process.resourcesPath, "icon.png");
  } else {
    iconPath = join(process.cwd(), "resources/icon.png");
  }
  console.log("尝试加载系统托盘图标，路径:", iconPath);
  const trayIcon = nativeImage.createFromPath(iconPath);

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "显示",
      click: () => window.show(),
    },
    {
      label: "隐藏",
      click: () => hideWindow(),
    },
    {
      label: "退出",
      click: () => App.exit(),
    },
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
    // 兼容开发和生产环境
    let iconPath: string;
    if (app.isPackaged) {
      // 打包后，icon.icns 会被放到 resources 目录下
      iconPath = join(process.resourcesPath, "icon.icns");
    } else {
      // 开发环境 - 使用 PNG 格式，因为 .icns 在开发环境中可能有问题
      iconPath = join(process.cwd(), "resources/icon-macOS-dock.png");
    }
    console.log("尝试加载 Dock 图标，路径:", iconPath);
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      app.dock.setIcon(icon);
      console.log("Dock 图标设置成功");
    } else {
      console.warn("图标加载失败，Dock 图标未设置，路径为:", iconPath);
    }
    // 设置 macOS 应用菜单
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: "Ghostie",
        submenu: [
          { role: "about" },
          { type: "separator" },
          { role: "services" },
          { type: "separator" },
          { role: "hide" },
          { role: "hideOthers" },
          { role: "unhide" },
          { type: "separator" },
          { role: "quit" },
        ],
      },
      {
        label: "编辑",
        submenu: [
          { role: "undo" },
          { role: "redo" },
          { type: "separator" },
          { role: "cut" },
          { role: "copy" },
          { role: "paste" },
          { role: "selectAll" },
        ],
      },
      {
        label: "视图",
        submenu: [
          { role: "reload" },
          { role: "forceReload" },
          { role: "toggleDevTools" },
          { type: "separator" },
          { role: "resetZoom" },
          { role: "zoomIn" },
          { role: "zoomOut" },
          { type: "separator" },
          { role: "togglefullscreen" },
          { type: "separator" },
        ],
      },
      {
        label: "标签页",
        submenu: SETTINGS_NAV_ITEMS.map(({ id, label }) => ({
          label,
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.send("switch-tab", {
                event: "switch-tab",
                payload: id,
                id: Date.now(),
              });
            }
          },
        })),
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  } else if (process.platform === "win32") {
    app.setAppUserModelId(process.execPath);
  }
}

/**
 * 设置 IPC 处理器
 */
async function setupIPCHandlers(): Promise<void> {
  ipc_handles();
  
  // 初始化 AgentManager
  const { AgentManager } = await import("./store/AgentManager");
  await AgentManager.init();
  
  // 初始化 Agent IPC 管理器
  const agentIpcManager = AgentIpcManager.getInstance();
  await agentIpcManager.initializeGlobalAgent();
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
  // 在 macOS 上，当所有窗口都关闭时，应用应该继续运行
  // 但用户可以通过 Dock 重新打开窗口
  if (process.platform !== "darwin") {
    app.quit();
  }
});

/**
 * 在 macOS 上，当应用被激活时，如果没有窗口，创建一个新窗口
 */
app.on("activate", () => {
  if (
    process.platform === "darwin" &&
    BrowserWindow.getAllWindows().length === 0
  ) {
    createWindow().catch(console.error);
  }
});

/**
 * 应用退出前清理全局快捷键
 */
app.on("will-quit", () => {
  globalShortcut.unregisterAll();
  
  // 清理 Agent IPC 管理器
  const agentIpcManager = AgentIpcManager.getInstance();
  agentIpcManager.cleanup();
});

/**
 * 处理开发模式下的热重载
 */
if (is.dev) {
  // 在开发模式下，确保只有一个主进程实例
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", () => {
      // 当尝试运行第二个实例时，聚焦到第一个实例
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
      }
    });
  }
}
