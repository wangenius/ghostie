import { AgentModelProps } from "@/agent/types/agent";
import { ModelKey } from "../key/ModelKey";
import { ModelProvider, ModelProviderList } from "../types/model";
import { AudioModel } from "./AudioModel";

/** 模型能力接口 */
export interface AudioModelProps {
  /** 模型名称 */
  name: string;
  /** 是否支持流式输出 */
  supportStream: boolean;
  /** 支持的声音类型 */
  voices: string[];
  /** 支持的语速范围 */
  speedRange: [number, number];
  /** 上下文窗口大小 */
  contextWindow: number;
  /** 描述 */
  description: string;
}

/** 模型提供商接口 */
export type AudioModelProvider = ModelProvider<AudioModelProps, AudioModel>;

export type AudioModelProviderList = ModelProviderList<AudioModelProvider>;

/** 音频模型管理器 */
export class AudioModelManager {
  /** 已注册的模型提供商 */
  private static readonly providers: AudioModelProviderList = {};

  /** 注册模型提供商
   * @param provider 模型提供商
   */
  public static registerProvider(provider: AudioModelProvider): void {
    this.providers[provider.name] = provider;
  }

  /** 获取所有已注册的模型提供商
   * @returns 所有已注册的模型提供商
   */
  public static getProviders(): AudioModelProviderList {
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
