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
        /** Supabase URL */
        supabaseUrl: string;
        /** Supabase 匿名密钥 */
        supabaseAnonKey: string;
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
        supabaseUrl: "https://iwuvrfojrkclhcxfcjzy.supabase.co",
        supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dXZyZm9qcmtjbGhjeGZjanp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTA0NDIsImV4cCI6MjA1ODk4NjQ0Mn0.L_VhFwjH1wO2KyqdUBruc1O0AH78mP-2mIkdQwTyak8",
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
        SUPABASE_URL: process.env.SUPABASE_URL || defaultConfig.api.supabaseUrl,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || defaultConfig.api.supabaseAnonKey,
        SALT_ROUNDS: parseInt(process.env.SALT_ROUNDS || defaultConfig.api.saltRounds.toString()),
        PACKAGE_VERSION: process.env.PACKAGE_VERSION || defaultConfig.version
    };
} 