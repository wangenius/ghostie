import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Doubao extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(DoubaoProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://ark.cn-beijing.volces.com/api/v3/chat/completions",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合豆包规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected RequestBodyAdapter(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 豆包使用OpenAI兼容的API格式，可能需要一些特殊处理
    const doubaoBody = { ...body };

    return doubaoBody;
  }
}

// 注册豆包提供商
const DoubaoProvider: ChatModelProvider = {
  name: "豆包",
  description: "豆包 (智谱AI大语言模型)",
  icon: "doubao-color.svg",
  models: {
    "doubao-1.5-pro-32k-250115": {
      name: "doubao-1.5-pro-32k-250115",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 32000,
      description:
        "最新一代专业版大模型，单价不提升的同时，模型能力有大幅提升，在知识（MMLU_PRO：80.2； GPQA：66.2）、代码（FullStackBench：65.1）、推理（DROP：92.6）、中文（C-Eval：91.5）等相关的多项测评中获得高分，达到行业SOTA水平。",
    },
    "doubao-1-5-pro-256k-250115": {
      name: "doubao-1-5-pro-256k-250115",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 256000,
      description:
        "最新一代专业版大模型，单价不提升的同时，模型能力有大幅提升，在知识（MMLU_PRO：80.2； GPQA：66.2）、代码（FullStackBench：65.1）、推理（DROP：92.6）、中文（C-Eval：91.5）等相关的多项测评中获得高分，达到行业SOTA水平。",
    },
    "doubao-1-5-lite-32k-250115": {
      name: "doubao-1-5-lite-32k-250115",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 32000,
      description:
        "最新一代轻量版大模型，单价不提升的同时，模型能力有大幅提升，模型效果比肩专业版模型doubao-pro-32k-0828，您享受轻量版模型的成本和性能，获得过去专业版模型的效果。",
    },
    "doubao-pro-32k-241215": {
      name: "doubao-pro-32k-241215",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 32000,
      description:
        "行业领先的专业版大模型，在参考问答、摘要总结、创作等广泛的应用场景上能提供优质的回答，是同时具备高质量与低成本的极具性价比模型。",
    },
    "doubao-pro-256k-241215": {
      name: "doubao-pro-256k-241215",
      supportJson: true,
      supportStream: true,
      supportToolCalls: false,
      supportReasoner: false,
      contextWindow: 256000,
      description:
        "行业领先的专业版大模型，在参考问答、摘要总结、创作等广泛的应用场景上能提供优质的回答，是同时具备高质量与低成本的极具性价比模型。",
    },
  },
  create: (model_name: string) => new Doubao(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(DoubaoProvider);
