import { ChatModelRequestBody, ToolCallReply } from "@/model/types/model";
import { ChatModel } from "../ChatModel";
import { ModelManager, ModelProvider } from "../ModelManager";

export class Claude extends ChatModel {
  constructor(model: string) {
    const api_key = ModelManager.getApiKey(ClaudeProvider.name);
    const configWithDefaults = {
      model,
      api_key,
      api_url: "https://api.anthropic.com/v1/messages",
    };

    super(configWithDefaults);
  }

  /**
   * 创建符合Claude规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // Claude特有的请求体处理
    const claudeBody = { ...body };

    // Claude API可能需要特殊处理，如调整工具格式或其他参数
    // 例如对于Claude，可能需要添加系统指令、设置最大token等

    return claudeBody;
  }

  /**
   * 解析Claude响应体格式
   * @param payload 原始响应数据字符串
   * @returns 统一格式的解析结果
   */
  protected parseResponseBody(payload: string): {
    content?: string;
    reasoner?: string;
    tool_call?: ToolCallReply;
  } {
    try {
      // 解析Claude的响应格式
      const data = JSON.parse(payload.replace("data: ", ""));

      let content = undefined;
      let reasoner = undefined;
      let tool_call = undefined;

      // 处理文本内容
      if (data.type === "content_block_delta" && data.delta?.text) {
        content = data.delta.text;
      }

      // 处理工具调用
      if (data.type === "tool_use") {
        // Claude工具格式与OpenAI不同，需要适配
        tool_call = {
          id: data.id || `tool_${Date.now()}`,
          index: 0,
          type: "function" as const,
          function: {
            name: data.name,
            arguments: JSON.stringify(data.input || {}),
          },
        };
      }

      return {
        content,
        reasoner,
        tool_call,
      };
    } catch (error) {
      console.error("Error parsing Claude response:", error);
      return {};
    }
  }
}

// 注册Claude提供商
const ClaudeProvider: ModelProvider = {
  name: "Claude",
  description: "Anthropic Claude (基于宪章的AI助手)",
  icon: "claude-color.svg",
  models: {
    "claude-3-opus-20240229": {
      name: "claude-3-opus-20240229",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "Claude 3 Opus - Anthropic最强大的模型，专注于复杂任务",
    },
    "claude-3-sonnet-20240229": {
      name: "claude-3-sonnet-20240229",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "Claude 3 Sonnet - 高性能与价格的平衡",
    },
    "claude-3-haiku-20240307": {
      name: "claude-3-haiku-20240307",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 200000,
      description: "Claude 3 Haiku - 最快的Claude模型，适合简单任务",
    },
    "claude-3-5-sonnet-20240620": {
      name: "claude-3-5-sonnet-20240620",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "Claude 3.5 Sonnet - 最新一代Claude模型，性能显著提升",
    },
  },
  create: (model_name: string) => new Claude(model_name),
};

// 注册到ChatModel
ModelManager.registerProvider(ClaudeProvider);
