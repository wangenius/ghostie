/** Chat模型
 * 该模型依赖于工具模块。
 */
import { gen } from "@/utils/generator";
import { ModelInfo } from "@common/types/agent";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  FunctionCallReply,
  FunctionCallResult,
  Message,
  StreamResponse,
  ToolFunctionInfo,
} from "@common/types/model";
import { Echo } from "echo-state";
import { HistoryMessage } from "./HistoryMessage";
import { ModelManager } from "./ModelManager";
import { ToolsManager } from "../tool/ToolsManager";

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
  public historyMessage: HistoryMessage = new HistoryMessage();
  /** 工具 */
  private tools: ToolFunctionInfo[] | undefined;
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

  public setModel(model_name: string): this {
    const modelInfo = ModelManager.get(model_name);
    this.model = modelInfo.model;
    this.api_key = modelInfo.api_key;
    this.api_url = modelInfo.api_url;
    return this;
  }

  /** 添加工具
   * @param tools 工具
   * @returns 当前模型实例
   */
  public setTools(tools: ToolFunctionInfo[]): this {
    this.tools = tools;
    return this;
  }

  /** hook消息历史
   */
  public useHistory = this.historyMessage.use.bind(
    this.historyMessage.messages
  );

  /** 设置系统提示词
   * @param prompt 系统提示词
   * @returns 当前模型实例
   */
  public system(prompt: string): this {
    this.historyMessage.system(prompt);
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
    const toolArgs = JSON.parse(function_call.arguments);
    const toolResultPromise = ToolsManager.exe({
      name: function_call.name,
      arguments: toolArgs,
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
  public async text(prompt: string): Promise<ChatModelResponse<string>> {
    const requestId = gen.id();
    try {
      /* 获取请求控制器 */
      const abortController = this.getAbortController(requestId);

      /* 创建请求体 */
      const requestBody: ChatModelRequestBody = {
        model: this.model,
        messages: this.historyMessage.push([{ role: "user", content: prompt }]),
        functions: this.tools,
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
        body: assistantMessage.content || "",
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
        };
        /* 添加消息到历史 */
        this.historyMessage.push([assistantMessage, functionResultMessage]);
        /* 创建工具调用结果 */
        result.tool = {
          name: assistantMessage.function_call.name,
          arguments: result.tool.arguments,
          result: result.tool.result,
        };
      } else {
        // 如果没有工具调用，只添加用户消息和助手回复到历史
        this.historyMessage.push([assistantMessage]);
      }
      this.loading.set({ loading: false });
      return result;
    } finally {
      this.removeAbortController(requestId);
    }
  }

  public async json<T = any>(
    prompt: string,
    template: Record<keyof T, string | any>
  ): Promise<ChatModelResponse<T>> {
    const requestId = gen.id();
    try {
      const abortController = this.getAbortController(requestId);

      let messages: Message[] = [];
      const newMessages: Message = { role: "user", content: prompt };

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
        functions: this.tools,
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
        };
        /* 添加消息到历史 */
        this.historyMessage.push([assistantMessage, functionResultMessage]);
        /* 创建工具调用结果 */
        result.tool = {
          name: assistantMessage.function_call.name,
          arguments: result.tool.arguments,
          result: result.tool.result,
        };
      } else {
        // 如果没有工具调用，只添加用户消息和助手回复到历史
        this.historyMessage.push([assistantMessage]);
      }
      this.loading.set({ loading: false });

      return result;
    } finally {
      this.removeAbortController(requestId);
    }
  }

  public async stream(prompt: string): Promise<ChatModelResponse<string>> {
    const requestId = gen.id();
    let functionCallData: FunctionCallReply | undefined;
    let content = "";

    // 添加用户消息并创建助手消息
    this.historyMessage.push([{ role: "user", content: prompt }]);
    this.historyMessage.createAssistantMessage();

    const requestBody: ChatModelRequestBody = {
      model: this.model,
      messages: this.historyMessage.list(),
      stream: true,
      functions: this.tools,
    };

    this.loading.set({ loading: true });
    try {
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
              this.historyMessage.updateLastMessage((msg) => {
                msg.content = content;
              });
            }

            if (delta?.function_call) {
              functionCallData = functionCallData || {
                name: "",
                arguments: "",
              };
              if (delta.function_call.arguments) {
                functionCallData.arguments += delta.function_call.arguments;
              }
              if (delta.function_call.name) {
                functionCallData.name = delta.function_call.name;
              }
              this.historyMessage.updateLastMessage((msg) => {
                msg.function_call = functionCallData;
                msg.content = content;
              });
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      let toolResult;
      // 如果有函数调用，处理工具调用结果
      if (functionCallData) {
        toolResult = await this.tool_call(functionCallData);
        if (toolResult) {
          this.historyMessage.push([
            {
              role: "function",
              name: functionCallData.name,
              content: JSON.stringify(toolResult.result),
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
