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
} from "@/model/types/model";
import { TOOL_NAME_SPLIT } from "../bot/Bot";
import { HistoryMessage } from "./HistoryMessage";
import { Knowledge } from "../knowledge/Knowledge";
import { WorkflowManager } from "@/workflow/WorkflowManager";
import { StartNodeConfig } from "@/workflow/types/nodes";
import { Workflow } from "@/workflow/execute/Workflow";

/** 请求配置 */
interface RequestConfig {
  /** 用户消息类型 */
  user: MessageType;
  /** 助手消息类型 */
  assistant: MessageType;
  /** 工具消息类型 */
  function: MessageType;
}

/** Chat模型, 用于与模型进行交互 */
export class ChatModel {
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
  /** 知识 */
  private knowledges: ToolRequestBody | undefined;
  /** 工作流 */
  private workflows: ToolRequestBody | undefined;
  /** 当前请求ID */
  private currentRequestId: string | undefined;
  /** 温度 */
  private temperature: number = 1;

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config?: Partial<ModelInfo>) {
    this.api_key = config?.api_key || "";
    this.api_url = config?.api_url || "";
    this.model = config?.model || "";
  }

  setBot(bot: string): this {
    this.historyMessage.setBot(bot);
    return this;
  }

  setTemperature(temperature: number): this {
    this.temperature = temperature;
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

  public async setWorkflows(workflows: string[]): Promise<this> {
    if (workflows.length) {
      console.log(workflows);
      /* 获取工作流 */
      const flows = await WorkflowManager.current;
      workflows.forEach((workflow) => {
        const flow = flows[workflow];
        if (!flow) return;
        if (!this.workflows) {
          this.workflows = [];
        }
        const startNode = Object.values(flow.nodes).find(
          (node) => node.type === "start",
        );
        if (!startNode) return;
        /* 将工作流变成工具 */
        this.workflows?.push({
          type: "function",
          function: {
            name: `executeFlow_${flow.id}`,
            description: flow.description,
            parameters: (startNode.data as StartNodeConfig).parameters || null,
          },
        });
      });
    }
    return this;
  }
  public setKnowledge(docs: string[]): this {
    if (docs.length) {
      /* 获取知识库 */
      const knowledges = Knowledge.getList();

      /* 将知识库变成工具 */
      docs.forEach((knowledge) => {
        const knowledgeDoc = knowledges[knowledge];
        if (!knowledgeDoc) return;
        if (!this.knowledges) {
          this.knowledges = [];
        }
        this.knowledges?.push({
          type: "function",
          function: {
            name: `knowledge_${knowledge}`,
            description: `${knowledgeDoc.description}`,
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "查询字段或内容",
                },
              },
              required: ["query"],
            },
          },
        });
      });
    }
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
    this.currentRequestId = undefined;
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

  private async tool_call(
    tool_call: ToolCallReply,
  ): Promise<FunctionCallResult | undefined> {
    if (!tool_call) return;

    /* 知识库工具 */
    if (tool_call.function.name.startsWith("knowledge_")) {
      const knowledge = tool_call.function.name.split("_")[1];
      const query = JSON.parse(tool_call.function.arguments || "{}").query;
      if (!query) {
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result: "查询内容query不能为空",
        };
      }
      /* 搜索知识库 */
      const knowledgeDoc = await Knowledge.search(query, [knowledge]);
      return {
        name: tool_call.function.name,
        arguments: tool_call.function.arguments,
        result: knowledgeDoc,
      };
    }

    /* 工作流工具 */
    if (tool_call.function.name.startsWith("executeFlow_")) {
      const id = tool_call.function.name.split("_")[1];
      const workflow = await new Workflow().init(id);
      if (!workflow) {
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result: "工作流不存在",
        };
      }
      const result = await workflow.execute();
      return {
        name: tool_call.function.name,
        arguments: tool_call.function.arguments,
        result,
      };
    }

    /* 解析工具参数 */
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
   * @param prompt 提示词，如果为空，则使用历史消息，因为可能存在assistant的消息
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

      /* 创建请求体 */
      const requestBody: ChatModelRequestBody = {
        model: this.model,
        messages,
        stream: true,
        parallel_tool_calls: true,
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
          const delta = event.payload.choices[0]?.delta;
          const delta_tool_call = delta?.tool_calls?.[0] as ToolCallReply;

          console.log(delta);

          if (delta?.content) {
            content += delta.content;
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
