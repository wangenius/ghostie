/**
 * 应用配置管理
 * 定义应用的默认配置和配置接口
 */

/**
 * 应用配置接口
 */
export interface AppConfig {
    /** 应用名称 */
    name: string;
    /** 应用版本 */
    version: string;
    /** 应用描述 */
    description: string;
    /** 作者 */
    author: string;
    /** 主页 */
    homepage: string;
    /** 窗口配置 */
    window: {
        /** 默认宽度 */
        width: number;
        /** 默认高度 */
        height: number;
        /** 最小宽度 */
        minWidth: number;
        /** 最小高度 */
        minHeight: number;
        /** 是否透明 */
        transparent: boolean;
        /** 是否置顶 */
        alwaysOnTop: boolean;
    };
    /** 主题配置 */
    theme: {
        /** 默认主题 */
        default: string;
        /** 可用主题列表 */
        available: string[];
    };
    /** API 配置 */
    api: {
        /** 飞书 App ID */
        feishuAppId: string;
        /** 飞书 App Secret */
        feishuAppSecret: string;
        /** 盐轮数 */
        saltRounds: number;
    };
    /** 快捷键配置 */
    shortcuts: {
        /** 显示/隐藏窗口 */
        toggleWindow: string;
        /** 打开设置 */
        openSettings: string;
        /** 新建对话 */
        newChat: string;
    };
    /** 更新配置 */
    update: {
        /** 是否启用自动更新 */
        enabled: boolean;
        /** 更新服务器地址 */
        server: string;
        /** 更新检查间隔（毫秒） */
        checkInterval: number;
    };
}

/**
 * 默认应用配置
 */
export const defaultConfig: AppConfig = {
    name: "Ghostie",
    version: "0.1.80",
    description: "AI 助手桌面应用",
    author: "wangenius.com",
    homepage: "https://www.ghostie.com",
    window: {
        width: 1200,
        height: 800,
        minWidth: 1200,
        minHeight: 800,
        transparent: true,
        alwaysOnTop: false
    },
    theme: {
        default: "light",
        available: ["light", "dark", "system"]
    },
    api: {
        feishuAppId: "cli_a123456789abcdef", // 需要替换为实际的飞书 App ID
        feishuAppSecret: "your_feishu_app_secret", // 需要替换为实际的飞书 App Secret
        saltRounds: 10
    },
    shortcuts: {
        toggleWindow: "Alt+Space",
        openSettings: "Ctrl+,",
        newChat: "Ctrl+N"
    },
    update: {
        enabled: true,
        server: "https://github.com/wangenius/ghostie-releases/releases/latest/download/latest.json",
        checkInterval: 24 * 60 * 60 * 1000 // 24小时
    }
};

/**
 * 获取应用配置
 * @returns AppConfig 应用配置
 */
export function getAppConfig(): AppConfig {
    return defaultConfig;
}

/**
 * 获取环境变量配置
 * @returns 环境变量配置对象
 */
export function getEnvConfig() {
    return {
        API_KEY: process.env.API_KEY,
        FEISHU_APP_ID: process.env.FEISHU_APP_ID || defaultConfig.api.feishuAppId,
        FEISHU_APP_SECRET: process.env.FEISHU_APP_SECRET || defaultConfig.api.feishuAppSecret,
        SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || defaultConfig.api.saltRounds.toString()),
        PACKAGE_VERSION: process.env.PACKAGE_VERSION || defaultConfig.version
    };
} 