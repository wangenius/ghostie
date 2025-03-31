import { ModelInfo } from "@common/types/agent";
import { ChatModel } from "../ChatModel";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  MessagePrototype,
  MessageType,
  ToolCallReply,
} from "@/model/types/model";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { ModelManager, ModelProvider } from "../ModelManager";
/** 请求配置 */
interface RequestConfig {
  /** 用户消息类型 */
  user: MessageType;
  /** 助手消息类型 */
  assistant: MessageType;
  /** 工具消息类型 */
  function: MessageType;
}

export class Tongyi extends ChatModel {
  constructor(config?: Partial<ModelInfo>) {
    const api_key = ModelManager.getApiKey(TongyiProvider.name);
    // 设置默认API URL
    const configWithDefaults = {
      ...config,
      api_key,
      api_url:
        "https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation",
    };
    super(configWithDefaults);
  }

  /**
   * 创建符合通义规范的请求体
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 通义特有的请求体处理，例如添加特定参数或调整请求结构
    // 当前版本暂时保持相似的格式，仅作为示例
    const tongyiBody = { ...body };

    // 可能需要调整工具格式
    if (tongyiBody.tools) {
      // 根据通义API的工具格式进行调整
    }

    return tongyiBody;
  }

  /** 流式生成
   * @param prompt 提示词，如果为空，则使用历史消息
   * @param config 单独配置生成消息的显示类型
   * @returns 流式生成结果
   */
  public async stream(
    prompt?: string,
    config: RequestConfig = {
      user: MessageType.USER_INPUT,
      assistant: MessageType.ASSISTANT_REPLY,
      function: MessageType.TOOL_RESULT,
    },
  ): Promise<ChatModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    /* 生成请求ID */
    this.currentRequestId = gen.id();
    /* 内容 */
    let content = "";
    /* 消息 */
    let messages: MessagePrototype[] = [];
    /* 工具调用 */
    let tool_calls: ToolCallReply[] = [];

    try {
      /* 如果提示词为空，则使用历史消息 */
      if (!prompt) {
        messages = this.historyMessage.listWithOutType();
      } else {
        /* 添加用户消息 */
        messages = this.historyMessage.push([
          {
            role: "user",
            content: prompt,
            type: config.user,
            created_at: Date.now(),
          },
        ]);

        /* 等待一个微小延迟以确保用户消息被渲染 */
        await new Promise((resolve) => setTimeout(resolve, 10));

        /* 添加助手消息 */
        this.historyMessage.push([
          {
            role: "assistant",
            content: "",
            type: MessageType.ASSISTANT_PENDING,
            created_at: Date.now(),
          },
        ]);
      }

      /* 创建请求体 - 通义模型请求体可能与OpenAI有差异 */
      const requestBody: ChatModelRequestBody = {
        model: this.model,
        messages,
        stream: true,
        parallel_tool_calls: true, // 通义可能不支持此参数
        temperature: this.temperature,
      };

      if (this.tools?.length) {
        requestBody.tools = this.tools;
      }

      if (this.knowledges?.length) {
        requestBody.tools = [...(requestBody.tools || []), ...this.knowledges];
      }

      if (this.workflows?.length) {
        requestBody.tools = [...(requestBody.tools || []), ...this.workflows];
      }

      console.log(requestBody);
      // 监听流式响应事件
      const unlistenStream = await cmd.listen(
        `chat-stream-${this.currentRequestId}`,
        (event) => {
          const payload = JSON.parse(event.payload.replace("data: ", ""));
          // 通义模型的响应格式可能不同
          const delta = payload.choices?.[0]?.delta || payload.output?.text;

          // 通义模型的工具调用格式可能不同，需要适配
          const delta_tool_call = delta?.tool_calls?.[0] as ToolCallReply;

          console.log(delta);

          if (delta?.content || (typeof delta === "string" && delta)) {
            const deltaContent = delta?.content || delta;
            content += deltaContent;
            this.historyMessage.updateLastMessage({
              content,
              type: config.assistant,
            });
          }

          if (delta_tool_call) {
            if (delta_tool_call.id) {
              tool_calls[delta_tool_call.index] = {
                ...delta_tool_call,
                function: {
                  ...delta_tool_call.function,
                  arguments: delta_tool_call.function.arguments || "",
                },
              };
            } else if (delta_tool_call.function.arguments) {
              if (tool_calls[tool_calls.length - 1]) {
                tool_calls[tool_calls.length - 1].function.arguments +=
                  delta_tool_call.function.arguments;
              }
            }
          }
        },
      );

      // 监听错误事件
      const unlistenError = await cmd.listen(
        `chat-stream-error-${this.currentRequestId}`,
        (event) => {
          this.historyMessage.updateLastMessage({
            content: `请求失败: ${event.payload}`,
            type: MessageType.ASSISTANT_ERROR,
          });
          throw new Error(event.payload);
        },
      );

      // 发起流式请求
      await cmd.invoke("chat_stream", {
        apiUrl: this.api_url,
        apiKey: this.api_key,
        requestId: this.currentRequestId,
        requestBody,
        // 可能需要额外的通义请求头
        headers: {
          "Content-Type": "application/json",
        },
      });

      // 清理事件监听器
      unlistenStream();
      unlistenError();

      if (tool_calls.length > 0) {
        this.historyMessage.updateLastMessage({
          tool_calls,
          type: MessageType.ASSISTANT_TOOL,
        });
      }

      // 处理工具调用
      let toolResult;
      if (tool_calls.length > 0) {
        for (const tool_call of tool_calls) {
          toolResult = await this.tool_call(tool_call);
          if (toolResult) {
            this.historyMessage.push([
              {
                role: "tool",
                tool_call_id: tool_call.id,
                content: JSON.stringify(toolResult.result),
                type: config.function,
                created_at: Date.now(),
              },
            ]);
          }
        }
      }

      return {
        body: content,
        stop: () => this.stop(),
        tool: toolResult,
      };
    } catch (error) {
      this.currentRequestId = undefined;
      throw error;
    }
  }
}

// 注册通义提供商
const TongyiProvider: ModelProvider = {
  name: "通义",
  description: "阿里通义千问大模型 (Qwen系列)",
  models: {
    "qwen-turbo": {
      name: "qwen-turbo",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 6000,
      description: "通义千问-Turbo - 入门级模型，适合一般任务",
    },
    "qwen-plus": {
      name: "qwen-plus",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: false,
      contextWindow: 8000,
      description: "通义千问-Plus - 性能均衡的模型，适合大部分场景",
    },
    "qwen-max": {
      name: "qwen-max",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 30000,
      description: "通义千问-Max - 高性能模型，适合复杂任务",
    },
    "qwen-max-longcontext": {
      name: "qwen-max-longcontext",
      type: "text",
      supportJson: true,
      supportStream: true,
      supportToolCalls: true,
      supportReasoner: true,
      contextWindow: 100000,
      description: "通义千问-Max长上下文 - 支持超大上下文的高性能模型",
    },
  },
  create: () => new Tongyi(),
};

// 注册到ChatModel
ModelManager.registerProvider(TongyiProvider);
