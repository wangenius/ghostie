import { UserData } from "@/store/UserData";
import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createQwen } from "../model/llm/provider/qwenProvider";
import { LanguageModelV1 } from "@ai-sdk/provider";
import { IpcHandle, registerIpcHandlers } from "@/ipc/decorators";
import { ProviderConfigItem } from "@common/types/ProviderTypes";

/**
 * Provider 管理器
 * 负责管理所有的 AI Provider 配置和实例化
 */
export class ProviderManager {
  private static instance: ProviderManager;
  private providers: Map<string, ProviderConfigItem> = new Map();
  private static readonly PROVIDERS_FILE = "providers.json";
  private userData: UserData;

  private constructor() {
    registerIpcHandlers(this);
    this.userData = UserData.getInstance();
  }

  static getInstance(): ProviderManager {
    if (!ProviderManager.instance) {
      ProviderManager.instance = new ProviderManager();
    }
    return ProviderManager.instance;
  }

  /** 初始化 Provider 管理器 */
  async init(): Promise<void> {
    await this.loadProviders();
  }

  /** 从文件中加载 Provider 配置 */
  private async loadProviders(): Promise<void> {
    try {
      const savedProviders = await this.userData.load<Record<string, ProviderConfigItem>>(
        ProviderManager.PROVIDERS_FILE
      );
      this.providers.clear();

      console.log(savedProviders);

      Object.entries(savedProviders).forEach(([name, config]) => {
        this.providers.set(name, config as ProviderConfigItem);
      });

      console.log(`已加载 ${this.providers.size} 个 Provider 配置`);
    } catch (error) {
      console.error("加载 Provider 配置失败:", error);
    }
  }

  /** 保存 Provider 配置到文件 */
  private async saveProviders(): Promise<void> {
    try {
      const providersObj: Record<string, ProviderConfigItem> = {};
      this.providers.forEach((config, name) => {
        providersObj[name] = config;
      });

      await this.userData.save(providersObj, ProviderManager.PROVIDERS_FILE);
      console.log("Provider 配置已保存");
    } catch (error) {
      console.error("保存 Provider 配置失败:", error);
      throw error;
    }
  }

  /** 创建 Provider 实例 */
  createProviderInstance(providerName: string): any {
    const config = this.providers.get(providerName);
    if (!config) {
      throw new Error(`Provider "${providerName}" 不存在`);
    }

    const options = {
      apiKey: config.apiKey || "",
      baseURL: config.baseUrl,
    };

    switch (config.format) {
      case "openai":
        return createOpenAI(options);
      case "qwen":
        return createQwen(options);
      case "anthropic":
        return createAnthropic(options);
      default:
        throw new Error(`不支持的 Provider 格式: ${config.format}`);
    }
  }

  /** 创建语言模型实例 */
  createLanguageModel(
    providerName: string,
    modelName: string,
  ): LanguageModelV1 {
    const provider = this.createProviderInstance(providerName);
    return provider.languageModel(modelName);
  }

  // ==================== IPC 处理器 ====================

  @IpcHandle("provider-list")
  async getProvidersList(): Promise<ProviderConfigItem[]> {
    return Array.from(this.providers.values());
  }

  @IpcHandle("provider-get")
  async getProvider(name: string): Promise<ProviderConfigItem | null> {
    return this.providers.get(name) || null;
  }

  @IpcHandle("provider-add")
  async addProvider(config: ProviderConfigItem): Promise<void> {
    if (this.providers.has(config.id)) {
      throw new Error(`Provider "${config.id}" 已存在`);
    }

    this.providers.set(config.id, config);
    await this.saveProviders();
  }

  @IpcHandle("provider-update")
  async updateProvider(
    name: string,
    updates: Partial<ProviderConfigItem>,
  ): Promise<void> {
    const existing = this.providers.get(name);
    if (!existing) {
      throw new Error(`Provider "${name}" 不存在`);
    }

    const updated = { ...existing, ...updates };
    this.providers.set(name, updated);
    await this.saveProviders();
  }

  @IpcHandle("provider-delete")
  async deleteProvider(name: string): Promise<void> {
    if (!this.providers.has(name)) {
      throw new Error(`Provider "${name}" 不存在`);
    }

    this.providers.delete(name);
    await this.saveProviders();
  }

  @IpcHandle("provider-set")
  async setProviderConfig(
    name: string,
    config: { apiKey?: string; baseURL?: string },
  ): Promise<void> {
    const existing = this.providers.get(name);
    if (!existing) {
      throw new Error(`Provider "${name}" 不存在`);
    }

    const updated = { ...existing, ...config };
    this.providers.set(name, updated);
    await this.saveProviders();
  }

  @IpcHandle("provider-supported-formats")
  async getSupportedFormats(): Promise<string[]> {
    return ["openai", "qwen", "anthropic"];
  }

  @IpcHandle("provider-models")
  async getCommonModels(format: string): Promise<string[]> {
    const commonModels: Record<string, string[]> = {
      openai: ["gpt-4o", "gpt-4o-mini", "gpt-3.5-turbo", "gpt-4-turbo"],
      qwen: ["qwen-turbo", "qwen-plus", "qwen-max", "qwen-long"],
      anthropic: [
        "claude-3-5-sonnet-20241022",
        "claude-3-haiku-20240307",
        "claude-3-opus-20240229",
      ],
    };

    return commonModels[format] || [];
  }

  @IpcHandle("provider-get-models")
  async getProviderModels(providerName: string): Promise<string[]> {
    const config = this.providers.get(providerName);
    return config?.models || [];
  }

  @IpcHandle("provider-set-models")
  async setProviderModels(
    providerName: string,
    models: string[],
  ): Promise<void> {
    const existing = this.providers.get(providerName);
    if (!existing) {
      throw new Error(`Provider "${providerName}" 不存在`);
    }

    const updated = { ...existing, models: models };
    this.providers.set(providerName, updated);
    await this.saveProviders();
  }

  @IpcHandle("provider-test")
  async testProvider(
    config: ProviderConfigItem,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // 创建临时 Provider 实例进行测试
      const options = {
        apiKey: config.apiKey || "",
        baseURL: config.baseUrl,
      };

      let provider;
      switch (config.format) {
        case "openai":
          provider = createOpenAI(options);
          break;
        case "qwen":
          provider = createQwen(options);
          break;
        case "anthropic":
          provider = createAnthropic(options);
          break;
        default:
          throw new Error(`不支持的 Provider 格式: ${config.format}`);
      }

      // 尝试创建一个简单的模型实例来测试连接
      const testModel = config.models[0] || "test-model";
      provider.languageModel(testModel);

      return { success: true };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }
}
