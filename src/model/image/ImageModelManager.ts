import { AgentModelProps } from "@/agent/types/agent";
import { ModelKey } from "../key/ModelKey";
import { ModelProvider, ModelProviderList } from "../types/model";
import { ImageModel } from "./ImageModel";

/** 模型能力接口 */
export interface ImageModelProps {
  /** 模型名称 */
  name: string;
  /** 是否支持流式输出 */
  supportStream: boolean;
  /** 支持的图像大小 */
  sizes: string[];
  /** 支持的图像质量 */
  qualities: string[];
  /** 支持的图像风格 */
  styles: string[];
  /** 最大生成数量 */
  maxN: number;
  /** 上下文窗口大小 */
  contextWindow: number;
  /** 描述 */
  description: string;
}

/** 模型提供商接口 */
export type ImageModelProvider = ModelProvider<ImageModelProps, ImageModel>;

export type ImageModelProviderList = ModelProviderList<ImageModelProvider>;

/** 模型管理器, 用于管理模型 */
export class ImageModelManager {
  /** 已注册的模型提供商 */
  private static readonly providers: ImageModelProviderList = {};

  /** 注册模型提供商
   * @param provider 模型提供商
   */
  public static registerProvider(provider: ImageModelProvider): void {
    this.providers[provider.name] = provider;
  }

  /** 获取所有已注册的模型提供商
   * @returns 所有已注册的模型提供商
   */
  public static getProviders(): ImageModelProviderList {
    return this.providers;
  }

  static get(provider: string) {
    return this.providers[provider];
  }

  static getModel(
    { provider, name }: AgentModelProps = { provider: "", name: "" },
  ) {
    return this.providers[provider]?.models[name];
  }

  static getApiKey(provider: string) {
    return ModelKey.get(provider);
  }

  static setApiKey(provider: string, key: string) {
    ModelKey.set(provider, key);
  }
}
