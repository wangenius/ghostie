import { ModelProvider } from "../types/model";
import { EmbeddingModel } from "./EmbeddingModel";
/** 模型能力接口 */
export interface EmbeddingModelProps {
  name: string;
  description: string;
}

export type EmbeddingModelProvider = ModelProvider<
  EmbeddingModelProps,
  EmbeddingModel
>;

/** 模型管理器, 用于管理模型 */
export class EmbeddingModelManager {
  /** 已注册的模型提供商 */
  private static readonly providers: Record<string, EmbeddingModelProvider> =
    {};

  /** 注册模型提供商
   * @param provider 模型提供商
   */
  public static registerProvider(provider: EmbeddingModelProvider): void {
    this.providers[provider.name] = provider;
  }

  /** 获取所有已注册的模型提供商
   * @returns 所有已注册的模型提供商
   */
  public static getProviders(): Record<string, EmbeddingModelProvider> {
    return this.providers;
  }

  static get(provider: string) {
    return this.providers[provider];
  }

  static getModel(provider: string, name: string) {
    return this.providers[provider].create(name);
  }
}
