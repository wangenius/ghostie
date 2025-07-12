/**
 * IPC 通道类型定义
 * 定义主进程与渲染进程之间的通信接口
 */

/**
 * invoke 通道类型
 */
export type InvokeChannels = 
    | "open-files-path"
    | "open-file"
    | "save-file"
    | "read-file-text"
    | "write-file"
    | "get-file-drop-list"
    | "read-file"
    | "open-config-dir"
    | "open-url"
    | "notify"
    | "plugin-execute"
    | "env-list"
    | "env-save"
    | "node-install"
    | "node-check"
    | "node-list-dependencies"
    | "node-install-dependency"
    | "node-update-dependencies"
    | "node-uninstall-dependency"
    | "code-plugins"
    | "chat-stream"
    | "cancel-stream"
    | "image-result"
    | "image-generate"
    | "chat-json"
    | "start-service"
    | "stop-service"
    | "get-service-info"
    | "call-tool"
    | "plugin-save-content"
    | "plugin-get-content"
    | "plugin-delete"
    | "plugin-list"
    | "open-window"
    | "hide-window"
    | "setup-menu"
    | "toggle-tab"
    | "agent-list"
    | "agent-create"
    | "agent-get-by-id"
    | "agent-update"
    | "agent-delete"
    | "agent-chat"
    | "agent-get-current"
    | "agent-stop"
    | "agent-close"
    | "toolkit-market-fetch"
    | "toolkit-market-install"
    | "toolkit-market-uninstall"
    | "toolkit-market-check-exists"
    | "toolkit-market-upload";

/**
 * send 通道类型
 */
export type SendChannels = "notification";

/**
 * on 通道类型
 */
export type OnChannels = "update-available" | "update-downloaded" | "switch-tab";

/**
 * invoke 参数映射
 */
export type InvokeParamsMap = {
    "open-files-path": [];
    "open-file": [];
    "save-file": [any];
    "read-file-text": [string];
    "write-file": [string, string];
    "get-file-drop-list": [];
    "read-file": [string];
    "open-config-dir": [];
    "open-url": [string];
    "notify": [any];
    "plugin-execute": [string, string[]];
    "env-list": [];
    "env-save": [any];
    "node-install": [string];
    "node-check": [];
    "node-list-dependencies": [];
    "node-install-dependency": [string];
    "node-update-dependencies": [];
    "node-uninstall-dependency": [string];
    "code-plugins": [];
    "chat-stream": [string];
    "cancel-stream": [];
    "image-result": [];
    "image-generate": [string];
    "chat-json": [string];
    "start-service": [any];
    "stop-service": [];
    "get-service-info": [];
    "call-tool": [string, any];
    "plugin-save-content": [{ id: string; content: string }];
    "plugin-get-content": [{ id: string }];
    "plugin-delete": [{ id: string }];
    "plugin-list": [];
    "open-window": [{ name: string; query: any; config: any }];
    "hide-window": [];
    "setup-menu": [any];
    "toggle-tab": [string];
    "agent-list": [];
    "agent-create": [any?];
    "agent-get-by-id": [string];
    "agent-update": [string, any];
    "agent-delete": [string];
    "agent-chat": [string, string, any?];
    "agent-get-current": [];
    "agent-stop": [];
    "agent-close": [];
    "toolkit-market-fetch": [number, number];
    "toolkit-market-install": [any];
    "toolkit-market-uninstall": [string];
    "toolkit-market-check-exists": [string];
    "toolkit-market-upload": [any];
};

/**
 * invoke 返回值映射
 */
export type InvokeReturnMap = {
    "open-files-path": string[];
    "open-file": string | undefined;
    "save-file": string | undefined;
    "read-file-text": string;
    "write-file": boolean;
    "get-file-drop-list": string[];
    "read-file": ArrayBuffer;
    "open-config-dir": string;
    "open-url": void;
    "notify": void;
    "plugin-execute": { stdout: string; stderr: string };
    "env-list": Array<{ key: string; value: string | undefined }>;
    "env-save": void;
    "node-install": string;
    "node-check": string;
    "node-list-dependencies": string[];
    "node-install-dependency": void;
    "node-update-dependencies": void;
    "node-uninstall-dependency": void;
    "code-plugins": any[];
    "chat-stream": string;
    "cancel-stream": void;
    "image-result": any;
    "image-generate": string;
    "chat-json": any;
    "start-service": { success: boolean };
    "stop-service": void;
    "get-service-info": any;
    "call-tool": { result: string };
    "plugin-save-content": void;
    "plugin-get-content": string;
    "plugin-delete": void;
    "plugin-list": Array<{ name: string; path: string; type: "file" | "directory" }>;
    "open-window": void;
    "hide-window": void;
    "setup-menu": void;
    "toggle-tab": void;
    "agent-list": Record<string, any>;
    "agent-create": any;
    "agent-get-by-id": any | null;
    "agent-update": void;
    "agent-delete": void;
    "agent-chat": any;
    "agent-get-current": any;
    "agent-stop": void;
    "agent-close": void;
    "toolkit-market-fetch": any[];
    "toolkit-market-install": any;
    "toolkit-market-uninstall": void;
    "toolkit-market-check-exists": boolean;
    "toolkit-market-upload": void;
};

/**
 * send 参数映射
 */
export type SendParamsMap = {
    "notification": [string];
};

/**
 * on 回调参数映射
 */
export type OnCallbackParamsMap = {
    "update-available": [any];
    "update-downloaded": [any];
    "switch-tab": [{ event: string; payload: string; id: number }];
};

/**
 * 有效的通道列表
 */
export const validChannels = {
    invoke: [
        "open-files-path",
        "open-file",
        "save-file",
        "read-file-text",
        "write-file",
        "get-file-drop-list",
        "read-file",
        "open-config-dir",
        "open-url",
        "notify",
        "plugin-execute",
        "env-list",
        "env-save",
        "node-install",
        "node-check",
        "node-list-dependencies",
        "node-install-dependency",
        "node-update-dependencies",
        "node-uninstall-dependency",
        "code-plugins",
        "chat-stream",
        "cancel-stream",
        "image-result",
        "image-generate",
        "chat-json",
        "start-service",
        "stop-service",
        "get-service-info",
        "call-tool",
        "plugin-save-content",
        "plugin-get-content",
        "plugin-delete",
        "plugin-list",
        "open-window",
        "hide-window",
        "setup-menu",
        "toggle-tab",
        "agent-list",
        "agent-create",
        "agent-get-by-id",
        "agent-update",
        "agent-delete",
        "agent-chat",
        "agent-get-current",
        "agent-stop",
        "agent-close",
        "toolkit-market-fetch",
        "toolkit-market-install",
        "toolkit-market-uninstall",
        "toolkit-market-check-exists",
        "toolkit-market-upload"
    ] as const,
    send: ["notification"] as const,
    on: ["update-available", "update-downloaded", "switch-tab"] as const
}; 