import { ipcMain, dialog, shell, app } from "electron";
import { join } from "path";
import fs from "fs";
import { exec } from "child_process";
import { promisify } from "util";
import { mainWindow } from "./index";

const execAsync = promisify(exec);

/**
 * 注册所有 IPC 处理器
 * 处理渲染进程与主进程之间的通信
 */
export function ipc_handles(): void {
    // 文件操作相关处理器
    registerFileHandlers();
    
    // 窗口操作相关处理器
    registerWindowHandlers();
    
    // Node.js 插件相关处理器
    registerNodeHandlers();
    
    // 聊天功能相关处理器
    registerChatHandlers();
    
    // MCP 服务相关处理器
    registerMCPHandlers();
    
    // 插件文件系统相关处理器
    registerPluginFSHandlers();
}

/**
 * 注册文件操作相关的 IPC 处理器
 */
function registerFileHandlers(): void {
    /**
     * 打开文件选择对话框（多选）
     * @returns Promise<string[]> 选中的文件路径数组
     */
    ipcMain.handle("open-files-path", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile", "multiSelections"]
        });
        return result.filePaths;
    });

    /**
     * 打开文件选择对话框（单选）
     * @returns Promise<string | undefined> 选中的文件路径
     */
    ipcMain.handle("open-file", async () => {
        const result = await dialog.showOpenDialog({
            properties: ["openFile"]
        });
        return result.filePaths[0];
    });

    /**
     * 打开文件保存对话框
     * @param _ 事件对象
     * @param options 保存选项
     * @returns Promise<string | undefined> 保存的文件路径
     */
    ipcMain.handle("save-file", async (_, options: any) => {
        const result = await dialog.showSaveDialog({
            defaultPath: options.defaultPath,
            filters: options.filters
        });
        return result.filePath;
    });

    /**
     * 读取文本文件内容
     * @param _ 事件对象
     * @param filePath 文件路径
     * @returns Promise<string> 文件内容
     */
    ipcMain.handle("read-file-text", async (_, filePath: string) => {
        try {
            return fs.readFileSync(filePath, "utf-8");
        } catch (error) {
            throw new Error(`读取文件失败: ${error}`);
        }
    });

    /**
     * 写入文件内容
     * @param _ 事件对象
     * @param filePath 文件路径
     * @param content 文件内容
     * @returns Promise<boolean> 是否写入成功
     */
    ipcMain.handle("write-file", async (_, filePath: string, content: string) => {
        try {
            fs.writeFileSync(filePath, content, "utf-8");
            return true;
        } catch (error) {
            throw new Error(`写入文件失败: ${error}`);
        }
    });

    /**
     * 获取文件拖放列表
     * @returns Promise<string[]> 拖放的文件路径数组
     */
    ipcMain.handle("get-file-drop-list", async () => {
        // 在 Electron 中，文件拖放通常通过 DOM 事件处理
        return [];
    });

    /**
     * 读取文件为 ArrayBuffer
     * @param _ 事件对象
     * @param filePath 文件路径
     * @returns Promise<ArrayBuffer> 文件内容
     */
    ipcMain.handle("read-file", async (_, filePath: string) => {
        try {
            const buffer = fs.readFileSync(filePath);
            return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
        } catch (error) {
            throw new Error(`读取文件失败: ${error}`);
        }
    });
}

/**
 * 注册窗口操作相关的 IPC 处理器
 */
function registerWindowHandlers(): void {
    /**
     * 打开配置目录
     * @returns Promise<string> 配置目录路径
     */
    ipcMain.handle("open-config-dir", async () => {
        const configPath = join(app.getPath("userData"), "config");
        shell.openPath(configPath);
        return configPath;
    });

    /**
     * 打开外部 URL
     * @param _ 事件对象
     * @param url 要打开的 URL
     */
    ipcMain.handle("open-url", async (_, url: string) => {
        shell.openExternal(url);
    });

    /**
     * 显示系统通知
     * @param _ 事件对象
     * @param options 通知选项
     */
    ipcMain.handle("notify", async (_, options: any) => {
        // 实现通知功能
        console.log("通知:", options);
    });

    /**
     * 打开新窗口
     * @param _ 事件对象
     * @param params 窗口参数
     */
    ipcMain.handle("open-window", async (_, params: { name: string; query: any; config: any }) => {
        // TODO: 实现打开新窗口的功能
        console.log("打开新窗口:", params);
    });

    /**
     * 隐藏窗口
     */
    ipcMain.handle("hide-window", async () => {
        if (mainWindow) {
            mainWindow.hide();
        }
    });

    /**
     * 切换标签页
     * @param _ 事件对象
     * @param id 标签页 ID
     */
    ipcMain.handle("toggle-tab", async (_, id: string) => {
        if (mainWindow) {
            mainWindow.webContents.send("switch-tab", {
                event: "switch-tab",
                payload: id,
                id: Date.now()
            });
        }
    });
}

/**
 * 注册 Node.js 插件相关的 IPC 处理器
 */
function registerNodeHandlers(): void {
    /**
     * 执行插件命令
     * @param _ 事件对象
     * @param command 命令
     * @param args 命令参数
     * @returns Promise<{ stdout: string; stderr: string }> 执行结果
     */
    ipcMain.handle("plugin-execute", async (_, command: string, args: string[]) => {
        try {
            const { stdout, stderr } = await execAsync(command);
            return { stdout, stderr };
        } catch (error) {
            throw new Error(`执行命令失败: ${error}`);
        }
    });

    /**
     * 获取环境变量列表
     * @returns Promise<any[]> 环境变量列表
     */
    ipcMain.handle("env-list", async () => {
        // 实现环境变量列表功能
        return Object.entries(process.env).map(([key, value]) => ({ key, value }));
    });

    /**
     * 保存环境变量
     * @param _ 事件对象
     * @param env 环境变量对象
     */
    ipcMain.handle("env-save", async (_, env: any) => {
        // 实现环境变量保存功能
        console.log("保存环境变量:", env);
    });

    /**
     * 安装 Node.js 包
     * @param _ 事件对象
     * @param packageName 包名
     * @returns Promise<string> 安装结果
     */
    ipcMain.handle("node-install", async (_, packageName: string) => {
        try {
            const { stdout } = await execAsync(`npm install ${packageName}`);
            return stdout;
        } catch (error) {
            throw new Error(`安装包失败: ${error}`);
        }
    });

    /**
     * 检查 Node.js 版本
     * @returns Promise<string> Node.js 版本
     */
    ipcMain.handle("node-check", async () => {
        try {
            const { stdout } = await execAsync("node --version");
            return stdout.trim();
        } catch (error) {
            throw new Error(`检查 Node.js 失败: ${error}`);
        }
    });

    /**
     * 获取依赖列表
     * @returns Promise<any[]> 依赖列表
     */
    ipcMain.handle("node-list-dependencies", async () => {
        try {
            const { stdout } = await execAsync("npm list --depth=0");
            return stdout.split('\n').filter(line => line.trim());
        } catch (error) {
            return [];
        }
    });

    /**
     * 安装依赖
     * @param _ 事件对象
     * @param packageName 包名
     */
    ipcMain.handle("node-install-dependency", async (_, packageName: string) => {
        try {
            await execAsync(`npm install ${packageName}`);
        } catch (error) {
            throw new Error(`安装依赖失败: ${error}`);
        }
    });

    /**
     * 更新依赖
     */
    ipcMain.handle("node-update-dependencies", async () => {
        try {
            await execAsync("npm update");
        } catch (error) {
            throw new Error(`更新依赖失败: ${error}`);
        }
    });

    /**
     * 卸载依赖
     * @param _ 事件对象
     * @param packageName 包名
     */
    ipcMain.handle("node-uninstall-dependency", async (_, packageName: string) => {
        try {
            await execAsync(`npm uninstall ${packageName}`);
        } catch (error) {
            throw new Error(`卸载依赖失败: ${error}`);
        }
    });

    /**
     * 获取代码插件列表
     * @returns Promise<any[]> 插件列表
     */
    ipcMain.handle("code-plugins", async () => {
        // 实现代码插件功能
        return [];
    });
}

/**
 * 注册聊天功能相关的 IPC 处理器
 */
function registerChatHandlers(): void {
    /**
     * 聊天流处理
     * @param _ 事件对象
     * @param message 聊天消息
     * @returns Promise<string> 回复内容
     */
    ipcMain.handle("chat-stream", async (_, message: string) => {
        // 实现聊天流功能
        console.log("聊天消息:", message);
        return "这是模拟的回复";
    });

    /**
     * 取消聊天流
     */
    ipcMain.handle("cancel-stream", async () => {
        // 实现取消流功能
        console.log("取消聊天流");
    });

    /**
     * 获取图像结果
     * @returns Promise<any> 图像结果
     */
    ipcMain.handle("image-result", async () => {
        // 实现图像结果功能
        return null;
    });

    /**
     * 生成图像
     * @param _ 事件对象
     * @param prompt 图像描述
     * @returns Promise<string> 生成的图像路径
     */
    ipcMain.handle("image-generate", async (_, prompt: string) => {
        // 实现图像生成功能
        console.log("图像生成:", prompt);
        return "生成的图像路径";
    });

    /**
     * JSON 格式聊天
     * @param _ 事件对象
     * @param message 聊天消息
     * @returns Promise<any> JSON 格式回复
     */
    ipcMain.handle("chat-json", async (_, message: string) => {
        // 实现 JSON 聊天功能
        return { response: "JSON 格式回复", timestamp: new Date().toISOString() };
    });
}

/**
 * 注册 MCP 服务相关的 IPC 处理器
 */
function registerMCPHandlers(): void {
    /**
     * 启动 MCP 服务
     * @param _ 事件对象
     * @param serviceConfig 服务配置
     * @returns Promise<{ success: boolean }> 启动结果
     */
    ipcMain.handle("start-service", async (_, serviceConfig: any) => {
        // 实现 MCP 服务启动
        console.log("启动 MCP 服务:", serviceConfig);
        return { success: true };
    });

    /**
     * 停止 MCP 服务
     */
    ipcMain.handle("stop-service", async () => {
        // 实现停止服务功能
        console.log("停止 MCP 服务");
    });

    /**
     * 获取服务信息
     * @returns Promise<any> 服务信息
     */
    ipcMain.handle("get-service-info", async () => {
        // 实现获取服务信息功能
        return { status: "running", uptime: Date.now() };
    });

    /**
     * 调用工具
     * @param _ 事件对象
     * @param toolName 工具名称
     * @param params 工具参数
     * @returns Promise<{ result: string }> 工具执行结果
     */
    ipcMain.handle("call-tool", async (_, toolName: string, params: any) => {
        // 实现工具调用
        console.log("调用工具:", toolName, params);
        return { result: "工具执行结果" };
    });
}

/**
 * 注册插件文件系统相关的 IPC 处理器
 */
function registerPluginFSHandlers(): void {
    /**
     * 保存插件内容
     * @param _ 事件对象
     * @param params 参数对象 { id: string, content: string }
     */
    ipcMain.handle("plugin-save-content", async (_, params: { id: string; content: string }) => {
        try {
            const pluginDir = join(app.getPath("userData"), "plugins");
            // 确保 id 是字符串
            const pluginPath = typeof params.id === 'string' ? params.id : String(params.id);
            const fullPath = join(pluginDir, pluginPath);
            
            // 确保目录存在
            const dir = join(fullPath, "..");
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            
            fs.writeFileSync(fullPath, params.content, "utf-8");
        } catch (error) {
            console.error("保存插件内容失败:", error);
            throw new Error(`保存插件内容失败: ${error}`);
        }
    });

    /**
     * 获取插件内容
     * @param _ 事件对象
     * @param params 参数对象 { id: string }
     * @returns Promise<string> 文件内容
     */
    ipcMain.handle("plugin-get-content", async (_, params: { id: string }) => {
        try {
            const pluginDir = join(app.getPath("userData"), "plugins");
            // 确保 id 是字符串
            const pluginPath = typeof params.id === 'string' ? params.id : String(params.id);
            const fullPath = join(pluginDir, pluginPath);
            
            if (fs.existsSync(fullPath)) {
                return fs.readFileSync(fullPath, "utf-8");
            }
            return "";
        } catch (error) {
            console.error("获取插件内容失败:", error);
            throw new Error(`获取插件内容失败: ${error}`);
        }
    });

    /**
     * 删除插件文件
     * @param _ 事件对象
     * @param params 参数对象 { id: string }
     */
    ipcMain.handle("plugin-delete", async (_, params: { id: string }) => {
        try {
            const pluginDir = join(app.getPath("userData"), "plugins");
            // 确保 id 是字符串
            const pluginPath = typeof params.id === 'string' ? params.id : String(params.id);
            const fullPath = join(pluginDir, pluginPath);
            
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
        } catch (error) {
            console.error("删除插件文件失败:", error);
            throw new Error(`删除插件文件失败: ${error}`);
        }
    });

    /**
     * 获取插件列表
     * @returns Promise<any[]> 插件列表
     */
    ipcMain.handle("plugin-list", async () => {
        try {
            const pluginDir = join(app.getPath("userData"), "plugins");
            
            if (!fs.existsSync(pluginDir)) {
                return [];
            }
            
            const files = fs.readdirSync(pluginDir, { recursive: true });
            return files.map(file => ({
                name: file,
                path: file,
                type: fs.statSync(join(pluginDir, file)).isDirectory() ? "directory" : "file"
            }));
        } catch (error) {
            console.error("获取插件列表失败:", error);
            return [];
        }
    });
} 