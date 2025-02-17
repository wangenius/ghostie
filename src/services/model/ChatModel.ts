/** Chat模型
 * 该模型依赖于工具模块。
 */
import { ToolProps } from "@/common/types/plugin";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { ModelInfo } from "@common/types/agent";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  FunctionCallResult,
  MessagePrototype,
  MessageType,
  ToolCallReply,
  ToolRequestBody,
} from "@common/types/model";
import { TOOL_NAME_SPLIT } from "../bot/Bot";
import { HistoryMessage } from "./HistoryMessage";

/** 请求配置 */
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
  private tools: ToolRequestBody | undefined;

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
    this.tools = tools?.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
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
    tool_call: ToolCallReply
  ): Promise<FunctionCallResult | undefined> {
    if (!tool_call) return;
    console.log(tool_call.function.arguments);

    const toolArgs = JSON.parse(tool_call.function.arguments || "{}");
    try {
      /** 执行工具 */
      const toolResultPromise = cmd.invoke("plugin_execute", {
        id: tool_call.function.name.split(TOOL_NAME_SPLIT)[1],
        tool: tool_call.function.name.split(TOOL_NAME_SPLIT)[0],
        args: toolArgs,
      });

      /* 等待工具执行完成 */
      const toolResult = await toolResultPromise;

      console.log(toolResult);

      /* 返回工具调用结果 */
      return {
        name: tool_call.function.name,
        arguments: toolArgs,
        result: toolResult,
      };
    } catch (error) {
      return {
        name: tool_call.function.name,
        arguments: toolArgs,
        result: String(error),
      };
    }
  }

  /** 流式生成
   * @param prompt 提示词
   * @param config 单独配置生成消息的显示类型
   * @returns 流式生成结果
   */
  public async stream(
    prompt?: string,
    config: RequestConfig = {
      user: "user:input",
      assistant: "assistant:reply",
      function: "function:result",
    }
  ): Promise<ChatModelResponse<string>> {
    const requestId = gen.id();
    let content = "";
    let messages: MessagePrototype[] = [];
    try {
      if (prompt) {
        // 添加用户输入的消息, 返回请求消息
        messages = this.historyMessage.push([
          {
            role: "user",
            content: prompt,
            type: config.user,
            created_at: Date.now(),
          },
        ]);
      } else {
        messages = this.historyMessage.listWithOutType();
      }

      // 创建初始的助手消息, 用于显示加载中
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
        messages,
        stream: true,
        parallel_tool_calls: true,
      };
      if (this.tools?.length) {
        requestBody.tools = this.tools;
      }

      console.log(requestBody);

      /* 发送请求 */
      const response = await fetch(this.api_url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.api_key}`,
        },
        body: JSON.stringify(requestBody),
        signal: this.getAbortController(requestId).signal,
      });
      console.log(requestBody);

      /* 检查请求是否成功, 如果失败, 检查相关问题. */
      if (!response.ok || !response.body) {
        const errorResponse = await fetch(this.api_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${this.api_key}`,
          },
          body: JSON.stringify(requestBody),
          signal: this.getAbortController(requestId).signal,
        });

        /* 获取错误信息 */
        const errorText = await errorResponse.text();
        /* 更新最后一条消息, 显示错误信息 */
        this.historyMessage.updateLastMessage({
          content: `请求失败: ${errorResponse.status} - ${errorText}`,
          type: "assistant:error",
        });
        return {
          body: `请求失败: ${errorResponse.status} - ${errorText}`,
          stop: () => this.stop(requestId),
          tool: undefined,
        };
      }

      /* 获取流式读取器 */
      const reader = response.body!.getReader();
      /* 解码器 */
      const decoder = new TextDecoder();
      let tool_calls: ToolCallReply[] = [];

      try {
        while (true) {
          /* 读取流式数据 */
          const { done, value } = await reader.read();
          if (done) break;

          /* 解码数据 */
          const text = decoder.decode(value);
          /* 按行分割 */
          const lines = text.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
            /* 解析数据 */
            const json = JSON.parse(line.slice(5));
            /* 获取助手消息 */
            const delta = json.choices[0]?.delta;
            /* 获取工具调用 */
            const delta_tool_call = delta?.tool_calls?.[0] as ToolCallReply;

            if (delta?.content) {
              content += delta.content;
              // 只在有实际内容时更新type
              this.historyMessage.updateLastMessage({
                content,
                type: config.assistant,
              });
            }

            if (delta_tool_call) {
              console.log(delta_tool_call);
              // 处理工具调用
              if (delta_tool_call.id) {
                tool_calls[delta_tool_call.index] = delta_tool_call;
              } else if (delta_tool_call.function.arguments) {
                tool_calls[tool_calls.length - 1].function.arguments +=
                  delta_tool_call.function.arguments;
              }
            }
          }
        }
        if (tool_calls.length > 0) {
          // 更新消息中的工具调用
          this.historyMessage.updateLastMessage({
            tool_calls,
            type: "assistant:tool",
          });
        }
      } finally {
        reader.releaseLock();
      }

      // 工具调用结果
      let toolResult;
      // 处理函数调用
      if (tool_calls) {
        for (const tool_call of tool_calls) {
          toolResult = await this.tool_call(tool_call);
          // 添加工具调用结果到历史
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
        stop: () => this.stop(requestId),
        tool: toolResult,
      };
    } catch (error) {
      // 发生错误时移除最后一条加载中的消息
      this.removeAbortController(requestId);
      throw error;
    } finally {
      this.removeAbortController(requestId);
    }
  }

  /** 文本生成
   * @param prompt 提示词
   * @param config 单独配置,可覆盖默认版本
   * @returns 文本生成结果
   */
  // public async text(
  //   prompt: string,
  //   config: RequestConfig = {
  //     user: "user:input",
  //     assistant: "assistant:reply",
  //     function: "function:result",
  //   }
  // ): Promise<ChatModelResponse<string>> {
  //   const requestId = gen.id();
  //   try {
  //     /* 获取请求控制器 */
  //     const abortController = this.getAbortController(requestId);

  //     const messages = this.historyMessage.push([
  //       {
  //         role: "user",
  //         content: prompt,
  //         type: config.user,
  //         created_at: Date.now(),
  //       },
  //     ]);

  //     /* 创建请求体
  //      * 添加用户消息
  //      */
  //     const requestBody: ChatModelRequestBody = {
  //       model: this.model,
  //       messages,
  //       tools: ChatModel.tool_to_function(this.tools),
  //     };
  //     this.loading.set({ loading: true });
  //     /* 发送请求 */
  //     const response = await fetch(this.api_url, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${this.api_key}`,
  //       },
  //       body: JSON.stringify(requestBody),
  //       signal: abortController.signal,
  //     });
  //     /* 检查请求是否成功 */
  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       throw new Error(`API请求失败: ${response.status} - ${errorText}`);
  //     }
  //     /* 获取响应数据 */
  //     const data = await response.json();
  //     /* 获取助手消息 */
  //     const assistantMessage = data.choices[0].message;
  //     /* 创建基本响应结果 */
  //     const result: ChatModelResponse<string> = {
  //       /* 助手消息内容 */
  //       body: assistantMessage.content || "",
  //       /* 停止请求 */
  //       stop: () => this.stop(requestId),
  //       /* 工具调用结果 */
  //       tool: await this.tool_call(assistantMessage.function_call),
  //     };

  //     /* 处理工具函数调用 */
  //     if (result.tool) {
  //       // 将工具函数执行结果添加到消息历史
  //       const functionResultMessage: Message = {
  //         role: "tool",
  //         name: assistantMessage.function_call.name,
  //         content: JSON.stringify(result.tool.result),
  //         type: config.function,
  //         created_at: Date.now(),
  //       };
  //       /* 添加消息到历史 */
  //       this.historyMessage.push([
  //         {
  //           ...assistantMessage,
  //           type: "assistant:tool",
  //           created_at: Date.now(),
  //         },
  //         functionResultMessage,
  //       ]);
  //     } else {
  //       // 如果没有工具调用，只添加用户消息和助手回复到历史
  //       this.historyMessage.push([
  //         {
  //           ...assistantMessage,
  //           type: config.assistant,
  //           created_at: Date.now(),
  //         },
  //       ]);
  //     }
  //     this.loading.set({ loading: false });
  //     return result;
  //   } catch (error) {
  //     this.loading.set({ loading: false });
  //     this.removeAbortController(requestId);
  //     // 如果没有工具调用，只添加用户消息和助手回复到历史
  //     this.historyMessage.push([
  //       {
  //         role: "assistant",
  //         content: String(error),
  //         type: "assistant:error",
  //         created_at: Date.now(),
  //       },
  //     ]);
  //     return {
  //       body: String(error),
  //       stop: () => this.stop(requestId),
  //       tool: undefined,
  //     };
  //   } finally {
  //     this.removeAbortController(requestId);
  //   }
  // }

  // public async json<T = any>(
  //   prompt: string,
  //   template: Record<keyof T, string | any>,
  //   config: RequestConfig = {
  //     user: "user:input",
  //     assistant: "assistant:reply",
  //     function: "function:result",
  //   }
  // ): Promise<ChatModelResponse<T>> {
  //   const requestId = gen.id();
  //   try {
  //     const abortController = this.getAbortController(requestId);

  //     let messages: MessagePrototype[] = [];
  //     const newMessages: Message = {
  //       role: "user",
  //       content: prompt,
  //       type: config.user,
  //       created_at: Date.now(),
  //     };

  //     if (template) {
  //       const templatePrompt = `请严格按照以下JSON格式返回(不添加额外字符)：\n${JSON.stringify(
  //         template
  //       )}`;
  //       newMessages.content += `\n\n${templatePrompt}`;
  //     }
  //     messages = this.historyMessage.push([newMessages]);

  //     /* 创建请求体 */
  //     const requestBody: ChatModelRequestBody = {
  //       model: this.model,
  //       messages,
  //       tools: ChatModel.tool_to_function(this.tools),
  //       response_format: { type: "json_object" },
  //     };
  //     this.loading.set({ loading: true });
  //     const response = await fetch(this.api_url, {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //         Authorization: `Bearer ${this.api_key}`,
  //       },
  //       body: JSON.stringify(requestBody),
  //       signal: abortController.signal,
  //     });

  //     if (!response.ok) {
  //       const errorText = await response.text();
  //       throw new Error(
  //         `API request failed: ${response.status} - ${errorText}`
  //       );
  //     }

  //     /* 获取响应数据 */
  //     const data = await response.json();
  //     /* 获取助手消息 */
  //     const assistantMessage = data.choices[0].message;

  //     /* 创建基本响应结果 */
  //     const result: ChatModelResponse<T> = {
  //       body: JSON.parse(assistantMessage.content) as T,
  //       stop: () => this.stop(requestId),
  //       tool: await this.tool_call(assistantMessage.function_call),
  //     };

  //     /* 处理工具函数调用 */
  //     if (result.tool) {
  //       // 将工具函数执行结果添加到消息历史
  //       const functionResultMessage: Message = {
  //         role: "tool",
  //         name: assistantMessage.function_call.name,
  //         content: JSON.stringify(result.tool.result),
  //         type: config.function,
  //         created_at: Date.now(),
  //       };
  //       /* 添加消息到历史 */
  //       this.historyMessage.push([
  //         { ...assistantMessage, type: config.assistant },
  //         functionResultMessage,
  //       ]);
  //       /* 创建工具调用结果 */
  //       result.tool = {
  //         name: assistantMessage.function_call.name,
  //         arguments: result.tool.arguments,
  //         result: result.tool.result,
  //       };
  //     } else {
  //       // 如果没有工具调用，只添加用户消息和助手回复到历史
  //       this.historyMessage.push([
  //         { ...assistantMessage, type: config.assistant },
  //       ]);
  //     }
  //     this.loading.set({ loading: false });

  //     return result;
  //   } finally {
  //     this.removeAbortController(requestId);
  //   }
  // }
  public stop(requestId?: string): void {
    if (requestId) {
      const controller = this.abortControllers.get(requestId);
      if (controller) {
        try {
          controller.abort();
        } catch (e) {
          // 忽略停止错误
        } finally {
          this.removeAbortController(requestId);
        }
      }
    } else {
      this.abortControllers.forEach((controller, id) => {
        try {
          controller.abort();
        } catch (e) {
          console.log(e);
          console.log(id);
        } finally {
          this.removeAbortController(id);
        }
      });
    }
  }
}
