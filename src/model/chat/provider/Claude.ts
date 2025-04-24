import { ChatModelRequestBody, ToolCallReply } from "@/model/types/chatModel";
import { ChatModel } from "../ChatModel";
import { ChatModelManager, ChatModelProvider } from "../ChatModelManager";

export class Claude extends ChatModel {
  constructor(model: string) {
    const api_key = ChatModelManager.getApiKey(ClaudeProvider.name);
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
  protected RequestBodyAdapter(
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
  protected ResponseBodyAdapter(payload: string): {
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
const ClaudeProvider: ChatModelProvider = {
  name: "Claude",
  description: "Anthropic Claude (基于宪章的AI助手)",
  icon: "claude-color.svg",
  models: {
    "claude-3-7-sonnet-latest": {
      name: "claude-3-7-sonnet-latest",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 200000,
      description: "最智能的模型,具有可切换扩展思维功能的最高智能水平和能力",
    },
    "claude-3-5-haiku-latest": {
      name: "claude-3-5-haiku-latest",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "闪电般速度的智能,最快的模型",
    },
    "claude-3-5-sonnet-latest": {
      name: "claude-3-5-sonnet-latest",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "之前最智能的模型,高水平的智能和能力",
    },
    "claude-3-5-sonnet-20240620": {
      name: "claude-3-5-sonnet-20240620",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 200000,
      description: "Claude 3.5 Sonnet - 最新一代Claude模型，性能全面升级",
    },
    "claude-3-opus-latest": {
      name: "claude-3-opus-latest",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "用于复杂任务的强大模型,顶级智能、流畅性和理解力",
    },
    "claude-3-haiku-20240307": {
      name: "claude-3-haiku-20240307",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 200000,
      description: "最快且最紧凑的模型，可实现近乎即时的响应",
    },
  },
  create: (model_name: string) => new Claude(model_name),
};

// 注册到ChatModel
ChatModelManager.registerProvider(ClaudeProvider);
