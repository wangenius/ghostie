import { ChatModelRequestBody } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class OpenRouter extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(OpenRouterProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://openrouter.ai/api/v1/chat/completions",
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
const OpenRouterProvider: ChatModelProvider = {
  name: "OpenRouter",
  description: "OpenRouter API",
  icon: "openrouter.svg",
  models: {
    "openai/gpt-4o": {
      name: "openai/gpt-4o",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 16000,
      description: "GPT-4o - 快速且经济的模型",
    },
    "anthropic/claude-3.7-sonnet": {
      name: "anthropic/claude-3.7-sonnet",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 2000000,
      description:
        "Claude 3.7 Sonnet is an advanced large language model with improved reasoning, coding, and problem-solving capabilities. It introduces a hybrid reasoning approach, allowing users to choose between rapid responses and extended, step-by-step processing for complex tasks. The model demonstrates notable improvements in coding, particularly in front-end development and full-stack updates, and excels in agentic workflows, where it can autonomously navigate multi-step processes.",
    },
    "anthropic/claude-3.5-sonnet": {
      name: "anthropic/claude-3.5-sonnet",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 128000,
      description: `新一代 Claude 3.5 Sonnet 提供优于 Opus 的功能，比 Sonnet 更快的速度，且价格与 Sonnet 相同。Sonnet 尤其擅长：

编码：在 SWE-Bench 验证中得分约 49%，高于上次最佳成绩，且没有任何花哨的提示框架
数据科学：增强人类数据科学专长；在导航非结构化数据的同时，使用多种工具进行洞察
视觉处理：擅长解读图表、图形和图像，准确转录文本以获得超越文本本身的洞察
代理任务：卓越的工具使用，使其在代理任务（即需要与其他系统交互的复杂、多步骤问题解决任务）中表现出色`,
    },
  },
  create: (model_name: string) => new OpenRouter(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(OpenRouterProvider);
