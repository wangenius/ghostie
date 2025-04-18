/** Chat模型 */
import { AgentModelProps, AgentProps } from "@/agent/types/agent";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  MessagePrototype,
  ToolCallReply,
  ToolRequestBody,
} from "@/model/types/chatModel";
import { ImageManager } from "@/resources/Image";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { ImageModel } from "../image/ImageModel";
import { ChatModelManager } from "./ChatModelManager";
import { Message } from "./Message";
import { ToolsHandler } from "./ToolsHandler";

interface ChatModelInfo {
  model: string;
  api_key: string;
  api_url: string;
}

/** Chat模型, 用于与模型进行交互
 *
 */
export class ChatModel {
  public info: ChatModelInfo;
  /** 模型用于存储的上下文内容 */
  public Message: Message = Message.create();
  /** 工具 */
  protected tools?: ToolRequestBody;
  /** 当前请求ID */
  protected currentRequestId: string | undefined;
  /** 温度 */
  protected temperature: number = 1;
  /** 其他模型 */
  protected otherModels?: AgentProps["models"];

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
  static create(model?: AgentModelProps) {
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

  setOtherModels(models: AgentProps["models"]): this {
    this.otherModels = models;
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
   * 准备请求体，允许子类重写以添加特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
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
  protected parseResponseBody(payload: string): {
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

  /** 流式生成
   * @param prompt 提示词，如果为空，则使用历史消息，因为可能存在assistant的消息
   * @returns 流式生成结果
   */
  public async stream(): Promise<ChatModelResponse<string>> {
    // 如果有正在进行的请求，先停止它
    if (this.currentRequestId) {
      await this.stop();
    }

    /* 生成请求ID */
    this.currentRequestId = gen.id();
    /* 内容 */
    let completionContent = "";
    let reasonerContent = "";

    /* 消息 */
    let messages: MessagePrototype[] = this.Message.listWithOutType();
    /* 工具调用 */
    let tool_calls: ToolCallReply[] = [];

    try {
      /* 创建请求体 */
      let requestBody: ChatModelRequestBody = {
        model: this.info.model,
        messages,
        stream: true,
        temperature: this.temperature,
        tools: this.tools,
      };

      this.Message.push([
        {
          role: "assistant",
          loading: true,
          content: "",
          created_at: Date.now(),
        },
      ]);

      /* 适配子类请求体 */
      requestBody = this.prepareRequestBody(requestBody);

      console.log(requestBody);

      // 监听流式响应事件
      const unlistenStream = await cmd.listen(
        `chat-stream-${this.currentRequestId}`,
        (event) => {
          if (!event.payload) return;
          /* 适配子类不同的相应格式 */
          const { completion, reasoner, tool_call } = this.parseResponseBody(
            event.payload,
          );

          if (reasoner) {
            reasonerContent += reasoner;
            this.Message.updateLastMessage({
              reasoner: reasonerContent,
            });
          }

          /* 如果返回的是正文 */
          if (completion) {
            /* 如果存在推理内容，则清空推理内容 */
            completionContent += completion;
            this.Message.updateLastMessage({
              content: completionContent,
            });
          }

          if (tool_call) {
            if (tool_call.id) {
              tool_calls[tool_call.index] = {
                ...tool_call,
                function: {
                  ...tool_call.function,
                  arguments: tool_call.function.arguments || "",
                },
              };
            } else if (tool_call.function.arguments) {
              if (tool_calls[tool_calls.length - 1]) {
                tool_calls[tool_calls.length - 1].function.arguments +=
                  tool_call.function.arguments;
              }
            }
          }
        },
      );

      // 监听错误事件
      const unlistenError = await cmd.listen(
        `chat-stream-error-${this.currentRequestId}`,
        (event) => {
          this.Message.updateLastMessage({
            error: `请求失败: ${event.payload}`,
          });
          throw new Error(event.payload);
        },
      );

      // 发起流式请求
      await cmd.invoke("chat_stream", {
        apiUrl: this.info.api_url,
        apiKey: this.info.api_key,
        requestId: this.currentRequestId,
        requestBody,
      });

      // 清理事件监听器
      unlistenStream();
      unlistenError();

      if (tool_calls.length > 0) {
        this.Message.updateLastMessage({
          tool_calls,
        });
      }

      let toolResult;
      if (tool_calls.length > 0) {
        for (const tool_call of tool_calls) {
          this.Message.updateLastMessage({
            loading: false,
          });
          this.Message.push([
            {
              role: "tool",
              tool_call_id: tool_call.id,
              content: "",
              tool_loading: true,
              created_at: Date.now(),
            },
          ]);
          toolResult = await ToolsHandler.call(
            tool_call,
            this.otherModels,
            this,
          );
          console.log(toolResult);

          if (
            toolResult?.name === "IMAGE" &&
            typeof toolResult.result === "string"
          ) {
            this.Message.updateLastMessage({
              images: [toolResult.result],
            });
            const newImage = ImageModel.create(this.otherModels?.image);
            newImage.setTaskId(toolResult.result);

            // 轮询检查图片生成状态
            let result;
            while (true) {
              result = await newImage.getResult();
              if (
                result.output.task_status === "SUCCEEDED" &&
                "results" in result.output &&
                result.output.results[0]?.base64
              ) {
                const base64Image = result.output.results[0].base64;
                await ImageManager.setImage(
                  toolResult.result,
                  base64Image,
                  "image/png",
                );
                await ImageManager.setImageTaskId(
                  toolResult.result,
                  toolResult.result,
                );

                this.Message.updateLastMessage({
                  tool_loading: false,
                  content: `图片已生成, 请返回结束语。图片的ID为${toolResult.result}。`,
                });
                break;
              } else if (result.output.task_status === "FAILED") {
                this.Message.updateLastMessage({
                  tool_loading: false,
                  error: "图片生成失败",
                });
                break;
              }
              // 等待3秒后再次检查
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          } else if (toolResult) {
            this.Message.updateLastMessage({
              content:
                typeof toolResult.result === "string"
                  ? toolResult.result
                  : JSON.stringify(toolResult.result),
              tool_loading: false,
            });
          }
        }
      }
      this.Message.updateLastMessage({
        loading: false,
      });

      return {
        body: completionContent,
        stop: () => this.stop(),
        tool: toolResult,
      };
    } catch (error) {
      this.currentRequestId = undefined;

      return {
        body: String(error),
        stop: () => this.stop(),
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
}
