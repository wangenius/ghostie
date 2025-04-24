/** 视觉模型管理器 */
import { ModelItem } from "@/agent/types/agent";
import { ModelKey } from "../key/ModelKey";
import {
  VisionModelProvider,
  VisionModelProviderList,
} from "../types/visionModel";
import { VisionModel } from "./VisionModel";

/** 视觉模型管理器 */
export class VisionModelManager {
  /** 已注册的模型提供商 */
  private static readonly providers: VisionModelProviderList = {};

  /** 注册模型提供商
   * @param provider 模型提供商
   */
  public static registerProvider(provider: VisionModelProvider): void {
    this.providers[provider.name] = provider;
  }

  /** 获取所有已注册的模型提供商
   * @returns 所有已注册的模型提供商
   */
  public static getProviders(): VisionModelProviderList {
    return this.providers;
  }

  /** 获取模型提供商
   * @param provider 提供商名称
   * @returns 模型提供商
   */
  static get(provider: string): VisionModelProvider {
    return this.providers[provider];
  }

  /** 获取模型
   * @param props 模型属性
   * @returns 模型实例
   */
  static getModel(
    { provider, name }: ModelItem = { provider: "", name: "" },
  ): VisionModel {
    return this.get(provider).create(name);
  }

  /** 获取API密钥
   * @param provider 提供商名称
   * @returns API密钥
   */
  static getApiKey(provider: string): string {
    return ModelKey.get(provider);
  }

  /** 设置API密钥
   * @param provider 提供商名称
   * @param key API密钥
   */
  static setApiKey(provider: string, key: string): void {
    ModelKey.set(provider, key);
  }
}
