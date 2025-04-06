import { AgentModelProps } from "@/agent/types/agent";
import { ModelKey } from "../key/ModelKey";
import { ModelProvider, ModelProviderList } from "../types/model";
import { ChatModel } from "./ChatModel";
/** 模型能力接口 */
export interface ChatModelProps {
  /** 模型名称 */
  name: string;
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
  /** 推理 */
  reasoner?: boolean;
}

/** 模型提供商接口 */
export type ChatModelProvider = ModelProvider<ChatModelProps, ChatModel>;

export type ChatModelProviderList = ModelProviderList<ChatModelProvider>;

/** 模型管理器, 用于管理模型 */
export class ChatModelManager {
  /** 已注册的模型提供商 */
  private static readonly providers: ChatModelProviderList = {};

  /** 注册模型提供商
   * @param provider 模型提供商
   */
  public static registerProvider(provider: ChatModelProvider): void {
    this.providers[provider.name] = provider;
  }

  /** 获取所有已注册的模型提供商
   * @returns 所有已注册的模型提供商
   */
  public static getProviders(): ChatModelProviderList {
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
