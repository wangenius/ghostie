/**
 * Tauri API 到 Electron IPC 的适配器
 * 这个文件提供了与 Tauri API 兼容的接口，但底层使用 Electron IPC
 * 确保现有代码能够无缝迁移到 Electron 平台
 */

/**
 * 文件系统操作适配器
 * 提供文件读写、选择等操作
 */
export const fs = {
    /**
     * 打开文件选择对话框（多选）
     * @returns Promise<string[]> 选中的文件路径数组
     */
    openFilesPath: async (): Promise<string[]> => {
        return (window as any).shell.invoke("open-files-path");
    },

    /**
     * 打开文件选择对话框（单选）
     * @returns Promise<string | undefined> 选中的文件路径
     */
    openFile: async (): Promise<string | undefined> => {
        return (window as any).shell.invoke("open-file");
    },

    /**
     * 打开文件保存对话框
     * @param options 保存选项
     * @returns Promise<string | undefined> 保存的文件路径
     */
    saveFile: async (options: any): Promise<string | undefined> => {
        return (window as any).shell.invoke("save-file", options);
    },

    /**
     * 读取文本文件内容
     * @param filePath 文件路径
     * @returns Promise<string> 文件内容
     */
    readFileText: async (filePath: string): Promise<string> => {
        return (window as any).shell.invoke("read-file-text", filePath);
    },

    /**
     * 写入文件内容
     * @param filePath 文件路径
     * @param content 文件内容
     * @returns Promise<boolean> 是否写入成功
     */
    writeFile: async (filePath: string, content: string): Promise<boolean> => {
        return (window as any).shell.invoke("write-file", filePath, content);
    },

    /**
     * 获取文件拖放列表
     * @returns Promise<string[]> 拖放的文件路径数组
     */
    getFileDropList: async (): Promise<string[]> => {
        return (window as any).shell.invoke("get-file-drop-list");
    },

    /**
     * 读取文件为 ArrayBuffer
     * @param filePath 文件路径
     * @returns Promise<ArrayBuffer> 文件内容
     */
    readFile: async (filePath: string): Promise<ArrayBuffer> => {
        return (window as any).shell.invoke("read-file", filePath);
    }
};

/**
 * 窗口操作适配器
 * 提供窗口管理相关功能
 */
export const windowApi = {
    /**
     * 打开配置目录
     * @returns Promise<string> 配置目录路径
     */
    openConfigDir: async (): Promise<string> => {
        return (window as any).shell.invoke("open-config-dir");
    },

    /**
     * 打开外部 URL
     * @param url 要打开的 URL
     * @returns Promise<void>
     */
    openUrl: async (url: string): Promise<void> => {
        return (window as any).shell.invoke("open-url", url);
    },

    /**
     * 显示系统通知
     * @param options 通知选项
     * @returns Promise<void>
     */
    notify: async (options: any): Promise<void> => {
        return (window as any).shell.invoke("notify", options);
    }
};

/**
 * Node.js 插件适配器
 * 提供 Node.js 插件管理功能
 */
export const node = {
    /**
     * 执行插件命令
     * @param command 命令
     * @param args 命令参数
     * @returns Promise<{ stdout: string; stderr: string }> 执行结果
     */
    pluginExecute: async (command: string, args: string[]): Promise<{ stdout: string; stderr: string }> => {
        return (window as any).shell.invoke("plugin-execute", command, args);
    },

    /**
     * 获取环境变量列表
     * @returns Promise<any[]> 环境变量列表
     */
    envList: async (): Promise<any[]> => {
        return (window as any).shell.invoke("env-list");
    },

    /**
     * 保存环境变量
     * @param env 环境变量对象
     * @returns Promise<void>
     */
    envSave: async (env: any): Promise<void> => {
        return (window as any).shell.invoke("env-save", env);
    },

    /**
     * 安装 Node.js 包
     * @param packageName 包名
     * @returns Promise<string> 安装结果
     */
    nodeInstall: async (packageName: string): Promise<string> => {
        return (window as any).shell.invoke("node-install", packageName);
    },

    /**
     * 检查 Node.js 版本
     * @returns Promise<string> Node.js 版本
     */
    nodeCheck: async (): Promise<string> => {
        return (window as any).shell.invoke("node-check");
    },

    /**
     * 获取依赖列表
     * @returns Promise<any[]> 依赖列表
     */
    nodeListDependencies: async (): Promise<any[]> => {
        return (window as any).shell.invoke("node-list-dependencies");
    },

    /**
     * 安装依赖
     * @param packageName 包名
     * @returns Promise<void>
     */
    nodeInstallDependency: async (packageName: string): Promise<void> => {
        return (window as any).shell.invoke("node-install-dependency", packageName);
    },

    /**
     * 更新依赖
     * @returns Promise<void>
     */
    nodeUpdateDependencies: async (): Promise<void> => {
        return (window as any).shell.invoke("node-update-dependencies");
    },

    /**
     * 卸载依赖
     * @param packageName 包名
     * @returns Promise<void>
     */
    nodeUninstallDependency: async (packageName: string): Promise<void> => {
        return (window as any).shell.invoke("node-uninstall-dependency", packageName);
    },

    /**
     * 获取代码插件列表
     * @returns Promise<any[]> 插件列表
     */
    codePlugins: async (): Promise<any[]> => {
        return (window as any).shell.invoke("code-plugins");
    }
};

/**
 * 聊天功能适配器
 * 提供聊天相关功能
 */
export const chat = {
    /**
     * 聊天流处理
     * @param message 聊天消息
     * @returns Promise<string> 回复内容
     */
    chatStream: async (message: string): Promise<string> => {
        return (window as any).shell.invoke("chat-stream", message);
    },

    /**
     * 取消聊天流
     * @returns Promise<void>
     */
    cancelStream: async (): Promise<void> => {
        return (window as any).shell.invoke("cancel-stream");
    },

    /**
     * 获取图像结果
     * @returns Promise<any> 图像结果
     */
    imageResult: async (): Promise<any> => {
        return (window as any).shell.invoke("image-result");
    },

    /**
     * 生成图像
     * @param prompt 图像描述
     * @returns Promise<string> 生成的图像路径
     */
    imageGenerate: async (prompt: string): Promise<string> => {
        return (window as any).shell.invoke("image-generate", prompt);
    },

    /**
     * JSON 格式聊天
     * @param message 聊天消息
     * @returns Promise<any> JSON 格式回复
     */
    chatJson: async (message: string): Promise<any> => {
        return (window as any).shell.invoke("chat-json", message);
    }
};

/**
 * MCP 功能适配器
 * 提供 MCP 服务相关功能
 */
export const mcp = {
    /**
     * 启动 MCP 服务
     * @param serviceConfig 服务配置
     * @returns Promise<{ success: boolean }> 启动结果
     */
    startService: async (serviceConfig: any): Promise<{ success: boolean }> => {
        return (window as any).shell.invoke("start-service", serviceConfig);
    },

    /**
     * 停止 MCP 服务
     * @returns Promise<void>
     */
    stopService: async (): Promise<void> => {
        return (window as any).shell.invoke("stop-service");
    },

    /**
     * 获取服务信息
     * @returns Promise<any> 服务信息
     */
    getServiceInfo: async (): Promise<any> => {
        return (window as any).shell.invoke("get-service-info");
    },

    /**
     * 调用工具
     * @param toolName 工具名称
     * @param params 工具参数
     * @returns Promise<{ result: string }> 工具执行结果
     */
    callTool: async (toolName: string, params: any): Promise<{ result: string }> => {
        return (window as any).shell.invoke("call-tool", toolName, params);
    }
};

/**
 * 插件文件系统适配器
 * 提供插件文件管理功能
 */
export const pluginFs = {
    /**
     * 保存插件内容
     * @param path 文件路径
     * @param content 文件内容
     * @returns Promise<void>
     */
    pluginSaveContent: async (path: string, content: string): Promise<void> => {
        await (window as any).shell.invoke("plugin-save-content", path, content);
    },

    /**
     * 获取插件内容
     * @param path 文件路径
     * @returns Promise<string> 文件内容
     */
    pluginGetContent: async (path: string): Promise<string> => {
        return (window as any).shell.invoke("plugin-get-content", path) || "";
    },

    /**
     * 删除插件文件
     * @param path 文件路径
     * @returns Promise<void>
     */
    pluginDelete: async (path: string): Promise<void> => {
        await (window as any).shell.invoke("plugin-delete", path);
    },

    /**
     * 获取插件列表
     * @returns Promise<any[]> 插件列表
     */
    pluginList: async (): Promise<any[]> => {
        return (window as any).shell.invoke("plugin-list") || [];
    }
};

/**
 * 导出所有适配器
 * 保持与 Tauri API 的兼容性
 */
export const tauri = {
    fs,
    window: windowApi,
    node,
    chat,
    mcp,
    pluginFs
};

/**
 * 为了兼容性，也导出为 invoke
 * 可以直接调用主进程方法
 */
export const invoke = (window as any).shell.invoke; 