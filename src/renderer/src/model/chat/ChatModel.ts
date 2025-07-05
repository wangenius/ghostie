/** Chat模型 */
import { ModelItem } from "@/agent/types/agent";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  CompletionMessage,
  ToolCallReply,
  ToolRequestBody,
} from "@/model/types/chatModel";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { ChatModelManager } from "./ChatModelManager";

interface ChatModelInfo {
  model: string;
  api_key: string;
  api_url: string;
}

type OnChunk = (chunk: { completion?: string; reasoner?: string }) => void;

/** Chat模型, 用于与模型进行交互
 *
 */
export class ChatModel {
  /** 模型信息 */
  public info: ChatModelInfo;
  /** 工具 */
  protected tools?: ToolRequestBody;
  /** 当前请求ID */
  protected currentRequestId: string | undefined;
  /** 温度 */
  protected temperature: number = 1;

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config: ChatModelInfo) {
    this.info = config;
  }

  /** 创建模型
   * @param modelwithprovider 模型名称 openai:gpt-4
   * @returns 模型实例
   */
  static create(model?: ModelItem) {
    if (model?.provider) {
      return ChatModelManager.get(model.provider).create(model.name);
    }
    return new ChatModel({
      api_key: "",
      api_url: "",
      model: "",
    });
  }

  setTemperature(temperature: number): this {
    this.temperature = temperature;
    return this;
  }

  setTools(tools: ToolRequestBody): this {
    if (tools.length > 0) {
      this.tools = tools;
    }
    return this;
  }

  addTools(tools: ToolRequestBody): this {
    if (this.tools) {
      this.tools = [...this.tools, ...tools];
    } else {
      this.tools = tools;
    }
    return this;
  }

  /**
   * 请求体适配器,允许子类重写以添加特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected RequestBodyAdapter(
    body: ChatModelRequestBody,
  ): ChatModelRequestBody {
    // 默认实现直接返回原始请求体
    return body;
  }

  /**
   * 解析响应体，处理不同提供商的响应格式差异
   * @param payload 原始响应数据字符串
   * @returns 解析后的内容、推理和工具调用
   */
  protected ResponseBodyAdapter(payload: string): {
    completion?: string;
    reasoner?: string;
    tool_call?: ToolCallReply;
  } {
    try {
      // 默认OpenAI格式解析
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;
      // 提取内容
      const completion = delta?.content;

      // 提取工具调用
      let tool_call;
      if (delta?.tool_calls?.[0]) {
        tool_call = delta.tool_calls[0] as ToolCallReply;
      }

      // 提取推理内容（如果有）
      const reasoner = delta?.reasoning_content;

      return {
        completion,
        reasoner,
        tool_call,
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * 工具调用适配器，处理工具调用的解析和合并
   * @param rawToolCalls 收集到的原始工具调用数组
   * @returns 处理后的工具调用数组
   */
  protected ToolCallAdapter(rawToolCalls: ToolCallReply[]): ToolCallReply[] {
    if (!rawToolCalls.length) return [];

    const callsMap = new Map<string, ToolCallReply>();

    for (const chunk of rawToolCalls) {
      // 如果有ID，说明是新的工具调用或者已存在调用的更新
      if (chunk.id) {
        const key = `${chunk.id}-${chunk.index}`;
        const existingCall = callsMap.get(key);

        if (existingCall) {
          // 更新已存在的调用
          existingCall.function.arguments += chunk.function.arguments || "";
        } else {
          // 创建新的调用
          const newCall: ToolCallReply = {
            ...chunk,
            function: {
              ...chunk.function,
              arguments: chunk.function.arguments || "",
            },
          };
          callsMap.set(key, newCall);
        }
      }
      // 没有ID但有参数内容，将参数追加到最后一个处理的工具调用
      else if (chunk.function.arguments) {
        // 获取最后一个添加的工具调用
        const lastAddedKey = Array.from(callsMap.keys()).pop();
        if (lastAddedKey) {
          const lastCall = callsMap.get(lastAddedKey);
          if (lastCall) {
            lastCall.function.arguments += chunk.function.arguments;
          }
        }
      }
    }

    // 将Map转换为数组，并按index排序
    return Array.from(callsMap.values()).sort((a, b) => a.index - b.index);
  }

  /** 流式生成
   * @param prompt 提示词，如果为空，则使用历史消息，因为可能存在assistant的消息
   * @returns 流式生成结果
   */
  public async stream(
    message: CompletionMessage[],
    onChunk?: OnChunk,
  ): Promise<ChatModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    /* 生成请求ID */
    this.currentRequestId = gen.id();
    /* 消息 */
    let messages: CompletionMessage[] = message;
    /* 工具调用收集 */
    let rawToolCalls: ToolCallReply[] = [];
    let completionContent = "";

    try {
      /* 创建请求体 */
      let requestBody: ChatModelRequestBody = {
        model: this.info.model,
        messages,
        stream: true,
        temperature: this.temperature,
        tools: this.tools,
      };

      /* 适配子类请求体 */
      requestBody = this.RequestBodyAdapter(requestBody);

      console.log("requestBody", requestBody);

      // 监听流式响应事件
      const unlistenStream = await cmd.listen(
        `chat-stream-${this.currentRequestId}`,
        (event) => {
          if (!event.payload) return;
          /* 适配子类不同的相应格式 */
          const chunk = this.ResponseBodyAdapter(event.payload);

          /* 内容 */
          completionContent += chunk.completion || "";
          onChunk?.({ completion: chunk.completion, reasoner: chunk.reasoner });

          /* 收集工具调用 */
          if (chunk.tool_call) {
            rawToolCalls.push(chunk.tool_call);
          }
        },
      );

      // 监听错误事件
      const unlistenError = await cmd.listen(
        `chat-stream-error-${this.currentRequestId}`,
        (event) => {
          throw new Error(event.payload);
        },
      );

      const body = {
        apiUrl: this.info.api_url,
        apiKey: this.info.api_key,
        requestId: this.currentRequestId,
        requestBody,
      };

      // 发起流式请求
      await cmd.invoke("chat_stream", body);

      // 清理事件监听器
      unlistenStream();
      unlistenError();

      // 直接处理所有收集到的工具调用
      const tool_calls = this.ToolCallAdapter(rawToolCalls);

      return {
        body: completionContent,
        stop: () => this.stop(),
        tool: tool_calls,
      };
    } catch (error) {
      this.currentRequestId = undefined;
      return {
        body: completionContent,
        error: String(error),
        stop: () => this.stop(),
        tool: rawToolCalls,
      };
    }
  }

  /** 停止生成 */
  public async stop(): Promise<void> {
    try {
      if (this.currentRequestId) {
        await cmd.invoke("cancel_stream", { requestId: this.currentRequestId });
        this.currentRequestId = undefined;
      }
    } catch (e) {
      console.error("Failed to stop stream:", e);
    }
  }

  /**
   * 以 JSON 结构输出内容并自动解析
   * @param message 历史消息
   * @param format JSON格式约束
   * @param examples 可选，格式示例
   * @returns Promise<any> 最终解析到的 JSON 对象
   */
  public async json(messages: CompletionMessage[]): Promise<any> {
    const body = {
      apiUrl: this.info.api_url,
      apiKey: this.info.api_key,
      requestBody: {
        model: this.info.model,
        messages,
        temperature: this.temperature,
        tools: this.tools,
      },
    };
    try {
      // 假设 tauri 命令返回字符串
      const result = await cmd.invoke("chat_json", body);
      return JSON.parse(result);
    } catch (e) {
      throw new Error("模型输出无法解析为 JSON: " + e);
    }
  }
}
