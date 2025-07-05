import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class DeerAPI extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(DeerAPIProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://api.deerapi.com/v1/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合OpenAI规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected RequestBodyAdapter(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    return body;
  }
}

// 注册OpenAI提供商
const DeerAPIProvider: ChatModelProvider = {
  name: "DeerAPI",
  description: "DeerAPI API",
  icon: "deer.svg",
  models: {
    "gpt-4.1": {
      name: "gpt-4.1",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 16000,
      description:
        "gpt-4.1：在编码和指令方面取得了重大进步；GPT-4.1成为编码的领先模型。 长上下文： 在多模态长上下文理解的基准 Video-MME 上，GPT-4.1 创造了一个新的最先进的结果。 GPT-4.1 模型系列以更低的成本提供卓越的性能。",
    },
    "o4-mini": {
      name: "o4-mini",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 8000,
      description:
        "是一个更小、更快且更经济的模型，研究表明它在数学、编码和视觉任务中表现良好，设计为高效且响应迅速，适合开发人员。于 2025 年 4 月 16 日发布。",
    },
    "o3-mini": {
      name: "o3-mini",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description:
        "o3-mini 是一个轻量级的自然语言处理模型，旨在在计算资源有限的环境中提供高效的文本处理能力。它具有以下特点：轻巧高效，快速响应，多用途。",
    },
    "claude-3-7-sonnet-20250219": {
      name: "claude-3-7-sonnet-20250219",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: "claude对标r1的大动作哈，强大的3.7正式上线哈",
    },
    "claude-3-5-sonnet-20241022": {
      name: "claude-3-5-sonnet-20241022",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description:
        "Claude模型的最新版本 claude-3-5，具有最先进的语言处理技术，支持200K上下文、读取图片",
    },
    "grok-3-mini": {
      name: "grok-3-mini",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description:
        "一个轻量级的模型，在响应之前思考。快速、智能，非常适合不需要深厚领域知识的基于逻辑的任务。原始思维痕迹是可访问的。",
    },
    "grok-3": {
      name: "grok-3",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description:
        "Grok-3是埃隆·马斯克旗下xAI公司于2025年2月17日发布的最新人工智能聊天模型，其训练集群已达到20万卡级别，在数学、科学和编程等任务中表现出色，被马斯克誉为“地球上最聪明的人工智能”。",
    },
  },
  create: (model_name: string) => new DeerAPI(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(DeerAPIProvider);
