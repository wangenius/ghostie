import { Settings } from "@/store/Settings";
import { IpcHandle, registerIpcHandlers } from "@/ipc/decorators";

export interface ProviderConfig {
  name: string;
  format: "openai" | "qwen" | "anthropic";
  displayName: string;
  description?: string;
  apiKey?: string;
  baseURL?: string;
  customModels?: string[];
}

/**
 * Provider配置管理器
 * 负责管理用户自定义的Provider配置
 */
export class ProviderConfigManager {
  private static instance: ProviderConfigManager;
  private providers: Map<string, ProviderConfig> = new Map();
  private initialized: boolean = false;

  private constructor() {
    // 构造函数中不调用异步方法
  }

  static getInstance(): ProviderConfigManager {
    if (!ProviderConfigManager.instance) {
      ProviderConfigManager.instance = new ProviderConfigManager();
    }
    return ProviderConfigManager.instance;
  }

  /**
   * 初始化Provider配置管理器
   */
  async init(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.loadProviders();
    // 注册IPC处理器
    registerIpcHandlers(this);
    this.initialized = true;
    console.log("ProviderConfigManager 初始化完成");
  }

  /**
   * 加载已保存的Provider配置
   */
  private async loadProviders() {
    try {
      const savedProviders = (await Settings.get("providers")) || [];
      for (const config of savedProviders) {
        this.providers.set(config.name, config);
        this.registerProvider(config);
      }
      console.log("已加载Provider配置:", Array.from(this.providers.keys()));
    } catch (error) {
      console.error("加载Provider配置失败:", error);
    }
  }

  /**
   * 保存Provider配置到设置
   */
  private async saveProviders() {
    try {
      const providerArray = Array.from(this.providers.values());
      await Settings.set("providers", providerArray);
    } catch (error) {
      console.error("保存Provider配置失败:", error);
    }
  }

  /**
   * 注册Provider到LLM系统
   */
  private registerProvider(config: ProviderConfig) {
    try {
      console.log(`已注册Provider: ${config.name} (${config.format})`);
    } catch (error) {
      console.error(`注册Provider失败 ${config.name}:`, error);
    }
  }

  /**
   * 获取Provider列表
   */
  @IpcHandle("provider-list")
  async getProviderList(): Promise<ProviderConfig[]> {
    return Array.from(this.providers.values());
  }

  /**
   * 获取支持的格式
   */
  @IpcHandle("provider-supported-formats")
  async getSupportedFormats(): Promise<string[]> {
    return ["openai", "anthropic", "qwen"];
  }

  /**
   * 添加Provider - IPC处理器
   */
  @IpcHandle("provider-add")
  async addProviderIpc(config: ProviderConfig): Promise<void> {
    return this.addProvider(config);
  }

  /**
   * 更新Provider - IPC处理器
   */
  @IpcHandle("provider-update")
  async updateProviderIpc(
    name: string,
    config: Partial<ProviderConfig>,
  ): Promise<void> {
    return this.updateProvider(name, config);
  }

  /**
   * 删除Provider - IPC处理器
   */
  @IpcHandle("provider-delete")
  async deleteProviderIpc(name: string): Promise<void> {
    return this.deleteProvider(name);
  }

  /**
   * 获取特定Provider - IPC处理器
   */
  @IpcHandle("provider-get")
  async getProviderIpc(name: string): Promise<ProviderConfig | null> {
    return this.getProvider(name) || null;
  }

  /**
   * 设置Provider配置 - IPC处理器
   */
  @IpcHandle("provider-set")
  async setProviderIpc(
    name: string,
    config: { apiKey?: string; baseURL?: string },
  ): Promise<void> {
    return this.updateProvider(name, config);
  }

  /**
   * 删除Provider (别名) - IPC处理器
   */
  @IpcHandle("provider-remove")
  async removeProviderIpc(name: string): Promise<void> {
    return this.deleteProvider(name);
  }

  /**
   * 获取格式对应的常用模型 - IPC处理器
   */
  @IpcHandle("provider-models")
  async getProviderModels(format: string): Promise<string[]> {
    switch (format) {
      case "openai":
        return ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "gpt-3.5-turbo"];
      case "anthropic":
        return [
          "claude-3-5-sonnet-20241022",
          "claude-3-5-haiku-20241022",
          "claude-3-opus-20240229",
        ];
      case "qwen":
        return ["qwen-turbo", "qwen-plus", "qwen-max"];
      default:
        return [];
    }
  }

  /**
   * 获取特定Provider的模型列表 - IPC处理器
   */
  @IpcHandle("provider-get-models")
  async getProviderModelsList(providerName: string): Promise<string[]> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} 不存在`);
    }

    // 直接返回自定义模型列表，如果没有则返回空数组
    // 用户需要手动添加模型，不使用预设默认模型
    return provider.customModels || [];
  }

  /**
   * 设置Provider的自定义模型列表 - IPC处理器
   */
  @IpcHandle("provider-set-models")
  async setProviderModels(
    providerName: string,
    models: string[],
  ): Promise<void> {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`Provider ${providerName} 不存在`);
    }

    // 更新自定义模型列表
    const updated = { ...provider, customModels: models };
    this.providers.set(providerName, updated);
    await this.saveProviders();
  }

  /**
   * 添加Provider配置
   */
  async addProvider(config: ProviderConfig): Promise<void> {
    if (this.providers.has(config.name)) {
      throw new Error(`Provider ${config.name} 已存在`);
    }

    this.providers.set(config.name, config);
    this.registerProvider(config);
    await this.saveProviders();
  }

  /**
   * 更新Provider配置
   */
  async updateProvider(
    name: string,
    updates: Partial<ProviderConfig>,
  ): Promise<void> {
    const existing = this.providers.get(name);
    if (!existing) {
      throw new Error(`Provider ${name} 不存在`);
    }

    const updated = { ...existing, ...updates };
    this.providers.set(name, updated);
    this.registerProvider(updated);
    await this.saveProviders();
  }

  /**
   * 删除Provider配置
   */
  async deleteProvider(name: string): Promise<void> {
    if (!this.providers.has(name)) {
      throw new Error(`Provider ${name} 不存在`);
    }

    this.providers.delete(name);
    await this.saveProviders();
  }


  /**
   * 获取Provider配置
   */
  getProvider(name: string): ProviderConfig | undefined {
    return this.providers.get(name);
  }

  /**
   * 获取所有Provider配置
   */
  getAllProviders(): ProviderConfig[] {
    return Array.from(this.providers.values());
  }
}

// Provider配置管理器需要通过 init() 方法手动初始化
