/** Chat模型
 * 该模型依赖于工具模块。
 */
import { FunctionCallProps, ToolProps } from "@/common/types/plugin";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { ModelInfo } from "@common/types/agent";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  FunctionCallReply,
  FunctionCallResult,
  Message,
  MessageType,
} from "@common/types/model";
import { Echo } from "echo-state";
import { HistoryMessage } from "./HistoryMessage";

interface RequestConfig {
  user: MessageType;
  assistant: MessageType;
  function: MessageType;
}

/** Chat模型, 用于与模型进行交互 */
export class ChatModel {
  /** 请求控制器 */
  private abortControllers: Map<string, AbortController>;
  /** 模型 */
  private model: string;
  /** API密钥 */
  private api_key: string;
  /** API URL */
  private api_url: string;
  /** 消息历史 */
  public historyMessage: HistoryMessage = HistoryMessage.create();
  /** 工具 */
  private tools: ToolProps[] | undefined;
  /** 加载状态 */
  public loading = new Echo<{
    loading: boolean;
  }>({
    loading: false,
  });

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config?: Partial<ModelInfo>) {
    this.api_key = config?.api_key || "";
    this.api_url = config?.api_url || "";
    this.model = config?.model || "";
    this.abortControllers = new Map();
  }

  setBot(bot: string): this {
    this.historyMessage.setBot(bot);
    return this;
  }

  /** 添加工具
   * @param tools 工具
   * @returns 当前模型实例
   */
  public setTools(tools: ToolProps[]): this {
    this.tools = tools;
    return this;
  }

  /** 设置系统提示词
   * @param prompt 系统提示词
   * @returns 当前模型实例
   */
  public system(prompt: string): this {
    this.historyMessage.setSystem(prompt);
    return this;
  }

  /** 创建新的模型实例
   * @param model 模型名称
   * @returns 新的模型实例
   */
  public new(model?: string): ChatModel {
    this.model = model || this.model;
    this.historyMessage.clear();
    return this;
  }

  public setApiKey(apiKey: string): this {
    this.api_key = apiKey;
    return this;
  }

  public setApiUrl(apiUrl: string): this {
    this.api_url = apiUrl;
    return this;
  }

  static tool_to_function(
    tools?: ToolProps[]
  ): FunctionCallProps[] | undefined {
    return tools?.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    }));
  }

  private getAbortController(requestId: string): AbortController {
    if (!this.abortControllers.has(requestId)) {
      this.abortControllers.set(requestId, new AbortController());
    }
    return this.abortControllers.get(requestId)!;
  }

  private removeAbortController(requestId: string): void {
    this.abortControllers.delete(requestId);
  }

  private async tool_call(
    function_call: FunctionCallReply
  ): Promise<FunctionCallResult | undefined> {
    if (!function_call) return;

    /* 解析工具参数 */
    const toolArgs = JSON.parse(function_call.arguments || "{}");

    /* 查找对应的工具 */
    const tool = this.tools?.find((tool) => tool.name === function_call.name);
    if (!tool) {
      throw new Error(`找不到工具: ${function_call.name}`);
    }

    /* 执行工具 */
    const toolResultPromise = cmd.invoke("plugin_execute", {
      id: tool.plugin,
      tool: tool.name.split("]")[1],
      args: toolArgs,
    });

    /* 等待工具执行完成 */
    const toolResult = await toolResultPromise;

    if (toolResult === undefined || toolResult === null) {
      throw new Error("工具执行结果无效");
    }

    /* 返回工具调用结果 */
    return {
      name: function_call.name,
      arguments: toolArgs,
      result: toolResult,
    };
  }

  /** 文本生成
   * @param prompt 提示词
   * @param config 单独配置,可覆盖默认版本
   * @returns 文本生成结果
   */
  public async text(
    prompt: string,
    config: RequestConfig = {
      user: "user:input",
      assistant: "assistant:reply",
      function: "function:result",
    }
  ): Promise<ChatModelResponse<string>> {
    const requestId = gen.id();
    try {
      /* 获取请求控制器 */
      const abortController = this.getAbortController(requestId);

      /* 创建请求体
       * 添加用户消息
       */
      const requestBody: ChatModelRequestBody = {
        model: this.model,
        messages: this.historyMessage.push([
          {
            role: "user",
            content: prompt,
            type: config.user,
            created_at: Date.now(),
          },
        ]),
        functions: ChatModel.tool_to_function(this.tools),
      };
      this.loading.set({ loading: true });
      /* 发送请求 */
      const response = await fetch(this.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.api_key}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });
      /* 检查请求是否成功 */
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API请求失败: ${response.status} - ${errorText}`);
      }
      /* 获取响应数据 */
      const data = await response.json();
      /* 获取助手消息 */
      const assistantMessage = data.choices[0].message;
      /* 创建基本响应结果 */
      const result: ChatModelResponse<string> = {
        /* 助手消息内容 */
        body: assistantMessage.content || "",
        /* 停止请求 */
        stop: () => this.stop(requestId),
        /* 工具调用结果 */
        tool: await this.tool_call(assistantMessage.function_call),
      };

      /* 处理工具函数调用 */
      if (result.tool) {
        // 将工具函数执行结果添加到消息历史
        const functionResultMessage: Message = {
          role: "function",
          name: assistantMessage.function_call.name,
          content: JSON.stringify(result.tool.result),
          type: config.function,
          created_at: Date.now(),
        };
        /* 添加消息到历史 */
        this.historyMessage.push([
          { ...assistantMessage, type: config.assistant },
          functionResultMessage,
        ]);
        /* 创建工具调用结果 */
        result.tool = {
          name: assistantMessage.function_call.name,
          arguments: result.tool.arguments,
          result: result.tool.result,
        };
      } else {
        // 如果没有工具调用，只添加用户消息和助手回复到历史
        this.historyMessage.push([
          { ...assistantMessage, type: config.assistant },
        ]);
      }
      this.loading.set({ loading: false });
      return result;
    } finally {
      this.removeAbortController(requestId);
    }
  }

  public async json<T = any>(
    prompt: string,
    template: Record<keyof T, string | any>,
    config: RequestConfig = {
      user: "user:input",
      assistant: "assistant:reply",
      function: "function:result",
    }
  ): Promise<ChatModelResponse<T>> {
    const requestId = gen.id();
    try {
      const abortController = this.getAbortController(requestId);

      let messages: Message[] = [];
      const newMessages: Message = {
        role: "user",
        content: prompt,
        type: config.user,
        created_at: Date.now(),
      };

      if (template) {
        const templatePrompt = `请严格按照以下JSON格式返回(不添加额外字符)：\n${JSON.stringify(
          template
        )}`;
        newMessages.content += `\n\n${templatePrompt}`;
      }
      messages = this.historyMessage.push([newMessages]);

      /* 创建请求体 */
      const requestBody: ChatModelRequestBody = {
        model: this.model,
        messages,
        functions: ChatModel.tool_to_function(this.tools),
        response_format: { type: "json_object" },
      };
      this.loading.set({ loading: true });
      const response = await fetch(this.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.api_key}`,
        },
        body: JSON.stringify(requestBody),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.status} - ${errorText}`
        );
      }

      /* 获取响应数据 */
      const data = await response.json();
      /* 获取助手消息 */
      const assistantMessage = data.choices[0].message;

      /* 创建基本响应结果 */
      const result: ChatModelResponse<T> = {
        body: JSON.parse(assistantMessage.content) as T,
        stop: () => this.stop(requestId),
        tool: await this.tool_call(assistantMessage.function_call),
      };

      /* 处理工具函数调用 */
      if (result.tool) {
        // 将工具函数执行结果添加到消息历史
        const functionResultMessage: Message = {
          role: "function",
          name: assistantMessage.function_call.name,
          content: JSON.stringify(result.tool.result),
          type: config.function,
          created_at: Date.now(),
        };
        /* 添加消息到历史 */
        this.historyMessage.push([
          { ...assistantMessage, type: config.assistant },
          functionResultMessage,
        ]);
        /* 创建工具调用结果 */
        result.tool = {
          name: assistantMessage.function_call.name,
          arguments: result.tool.arguments,
          result: result.tool.result,
        };
      } else {
        // 如果没有工具调用，只添加用户消息和助手回复到历史
        this.historyMessage.push([
          { ...assistantMessage, type: config.assistant },
        ]);
      }
      this.loading.set({ loading: false });

      return result;
    } finally {
      this.removeAbortController(requestId);
    }
  }

  public async stream(
    prompt: string,
    config: RequestConfig = {
      user: "user:input",
      assistant: "assistant:reply",
      function: "function:result",
    }
  ): Promise<ChatModelResponse<string>> {
    const requestId = gen.id();
    let functionCallData: FunctionCallReply | undefined;
    let content = "";

    try {
      // 添加用户消息
      this.historyMessage.push([
        {
          role: "user",
          content: prompt,
          type: config.user,
          created_at: Date.now(),
        },
      ]);

      // 创建初始的助手消息
      this.historyMessage.push([
        {
          role: "assistant",
          content: "",
          type: "assistant:loading",
          created_at: Date.now(),
        },
      ]);

      /* 创建请求体 */
      const requestBody: ChatModelRequestBody = {
        model: this.model,
        messages: this.historyMessage.listWithOutType(),
        stream: true,
        functions: ChatModel.tool_to_function(this.tools),
      };

      this.loading.set({ loading: true });

      const response = await fetch(this.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.api_key}`,
          "X-DashScope-SSE": "enable",
        },
        body: JSON.stringify(requestBody),
        signal: this.getAbortController(requestId).signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;

            const json = JSON.parse(line.slice(5));
            const delta = json.choices[0]?.delta;

            if (delta?.content) {
              content += delta.content;
              // 只在有实际内容时更新type
              this.historyMessage.updateLastMessage({
                content,
                type:
                  content.length > 0 ? config.assistant : "assistant:loading",
              });
            }

            if (delta?.function_call) {
              functionCallData = functionCallData || {
                name: "",
                arguments: "",
              };
              if (delta.function_call.name) {
                functionCallData.name = delta.function_call.name;
              }
              if (delta.function_call.arguments) {
                functionCallData.arguments += delta.function_call.arguments;
              }
              // 只在function_call完整时更新type
              if (functionCallData.name && functionCallData.arguments) {
                this.historyMessage.updateAssistantFunctionCall(
                  functionCallData
                );
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      let toolResult;
      // 处理函数调用
      if (functionCallData) {
        toolResult = await this.tool_call(functionCallData);
        if (toolResult) {
          this.historyMessage.push([
            {
              role: "function",
              name: functionCallData.name,
              content: JSON.stringify(toolResult.result),
              type: config.function,
              created_at: Date.now(),
            },
          ]);
        }
      }

      return {
        body: content,
        stop: () => this.stop(requestId),
        tool: toolResult,
      };
    } catch (error) {
      // 发生错误时移除最后一条加载中的消息
      this.loading.set({ loading: false });
      this.removeAbortController(requestId);
      throw error;
    } finally {
      this.loading.set({ loading: false });
      this.removeAbortController(requestId);
    }
  }

  public stop(requestId?: string): void {
    if (requestId) {
      const controller = this.abortControllers.get(requestId);
      if (controller) {
        try {
          controller.abort();
        } catch (e) {
          // 忽略停止错误
        } finally {
          this.loading.set({ loading: false });
          this.removeAbortController(requestId);
        }
      }
    } else {
      this.abortControllers.forEach((controller, id) => {
        try {
          controller.abort();
        } catch (e) {
          // 忽略停止错误
        } finally {
          this.loading.set({ loading: false });
          this.removeAbortController(id);
        }
      });
    }
  }
}
