import { Echo } from "echo-state";
import { ChatModel } from "./ChatModel";
/** 模型能力接口 */
export interface ModelCapability {
  /** 模型名称 */
  name: string;
  /** 模型类型 */
  type: string | "text" | "image" | "tts" | "audio" | "video" | "embedding";
  /** 是否支持JSON模式输出 */
  supportJson: boolean;
  /** 是否支持流式输出 */
  supportStream: boolean;
  /** 是否支持工具调用 */
  supportToolCalls: boolean;
  /** 是否支持推理能力 */
  supportReasoner: boolean;
  /** 上下文窗口大小 */
  contextWindow: number;
  /** 描述 */
  description: string;
}

/** 模型提供商接口 */
export interface ModelProvider {
  /** 提供商名称 */
  name: string;
  /** 提供商描述 */
  description: string;
  /** 提供商图标 */
  icon?: React.ReactNode;
  /** 支持的模型列表 */
  models: Record<string, ModelCapability>;
  /** 创建模型 */
  create: () => ChatModel;
}

/** 模型管理器, 用于管理模型 */
export class ModelManager {
  /** 已注册的模型提供商 */
  private static readonly providers: Record<string, ModelProvider> = {};
  private static keys = new Echo<Record<string, string>>({}).localStorage({
    name: "providers_api_keys",
  });

  /** 注册模型提供商
   * @param provider 模型提供商
   */
  public static registerProvider(provider: ModelProvider): void {
    this.providers[provider.name] = provider;
  }

  /** 获取所有已注册的模型提供商
   * @returns 所有已注册的模型提供商
   */
  public static getProviders(): Record<string, ModelProvider> {
    return this.providers;
  }

  static get(provider: string) {
    return this.providers[provider];
  }

  static use = this.keys.use.bind(this.keys);

  static getApiKey(provider: string) {
    return this.keys.current[provider];
  }

  static setApiKey(provider: string, key: string) {
    this.keys.set({ ...this.keys.current, [provider]: key });
  }

  /** 导出所有模型配置 */
  static export(): string {
    const models = this.keys.current;
    return JSON.stringify(models, null, 2);
  }

  /** 导入模型配置
   * @param jsonStr JSON字符串
   * @throws 如果JSON格式不正确或模型配置无效
   */
  static import(jsonStr: string) {
    try {
      const models = JSON.parse(jsonStr) as Record<string, string>;
      this.keys.set(models);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error("JSON格式不正确");
      }
      throw error;
    }
  }
}
