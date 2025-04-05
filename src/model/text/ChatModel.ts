/** Chat模型
 * 该模型依赖于工具模块。
 */
import { AgentModelProps } from "@/agent/types/agent";
import { TOOL_NAME_SPLIT } from "@/assets/const";
import {
  ChatModelRequestBody,
  ChatModelResponse,
  FunctionCallResult,
  MessagePrototype,
  MessageType,
  ToolCallReply,
  ToolRequestBody,
} from "@/model/types/chatModel";
import { StartNodeConfig, WorkflowBody } from "@/page/workflow/types/nodes";
import { ToolProps } from "@/plugin/types";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Workflow, WorkflowStore } from "@/workflow/Workflow";
import { Echo } from "echo-state";
import { Knowledge } from "../../knowledge/Knowledge";
import { ChatModelManager } from "./ChatModelManager";
import { HistoryMessage } from "./HistoryMessage";
import { WORKFLOW_BODY_DATABASE } from "@/workflow/const";
import { ToolPlugin } from "@/plugin/ToolPlugin";

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
  protected model: string;
  /** API密钥 */
  protected api_key: string;
  /** API URL */
  protected api_url: string;
  /** 消息历史 */
  public historyMessage: HistoryMessage = HistoryMessage.create();
  /** 工具 */
  protected tools: ToolRequestBody | undefined;
  /** 知识 */
  protected knowledges: ToolRequestBody | undefined;
  /** 工作流 */
  protected workflows: ToolRequestBody | undefined;
  /** 当前请求ID */
  protected currentRequestId: string | undefined;
  /** 温度 */
  protected temperature: number = 1;

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config: { api_key: string; api_url: string; model: string }) {
    this.api_key = config.api_key;
    this.api_url = config.api_url;
    this.model = config.model;
  }

  getApiUrl() {
    return this.api_url;
  }

  /** 创建模型
   * @param modelwithprovider 模型名称 openai:gpt-4
   * @returns 模型实例
   */
  static create(model?: AgentModelProps) {
    if (!model)
      return new ChatModel({
        api_key: "",
        api_url: "",
        model: "",
      });
    return ChatModelManager.get(model.provider).create(model.name);
  }

  setAgent(agent: string): this {
    this.historyMessage.setAgent(agent);
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
        parameters: tool.parameters || null,
      },
    }));
    return this;
  }

  public async setWorkflows(workflows: string[]): Promise<this> {
    if (workflows.length) {
      /* 获取工作流 */
      const flows = await WorkflowStore.getCurrent();
      workflows.forEach(async (workflow) => {
        const flow = flows[workflow];
        if (!flow) return;
        if (!this.workflows) {
          this.workflows = [];
        }

        const instance = Echo.get<WorkflowBody>({
          database: WORKFLOW_BODY_DATABASE,
          name: workflow,
        });

        const body = await instance.getCurrent();

        const startNode = Object.values(body?.nodes || {}).find(
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
    content?: string;
    reasoner?: string;
    tool_call?: ToolCallReply;
  } {
    try {
      // 默认OpenAI格式解析
      const data = JSON.parse(payload.replace("data: ", ""));
      const delta = data.choices?.[0]?.delta;

      // 提取内容
      const content = delta?.content;

      // 提取工具调用
      let tool_call;
      if (delta?.tool_calls?.[0]) {
        tool_call = delta.tool_calls[0] as ToolCallReply;
      }

      // 提取推理内容（如果有）
      const reasoner = delta?.reasoning_content;

      return {
        content,
        reasoner,
        tool_call,
      };
    } catch (error) {
      return {};
    }
  }

  protected async tool_call(
    tool_call: ToolCallReply,
  ): Promise<FunctionCallResult | undefined> {
    if (!tool_call) return;

    try {
      let query;
      try {
        query = JSON.parse(tool_call.function.arguments);
      } catch {
        throw new Error("工具调用参数错误");
      }

      if (tool_call.function.name.startsWith("knowledge_")) {
        const knowledge = tool_call.function.name.split("_")[1];
        if (!query.query) {
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: "查询内容query不能为空",
          };
        }
        /* 搜索知识库 */
        const knowledgeDoc = await Knowledge.search(query.query, [knowledge]);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result: knowledgeDoc,
        };
      }

      /* 工作流工具 */
      if (tool_call.function.name.startsWith("executeFlow_")) {
        const id = tool_call.function.name.split("_")[1];
        const workflow = await Workflow.get(id);
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

      const pluginId = tool_call.function.name.split(TOOL_NAME_SPLIT)[1];
      const toolName = tool_call.function.name.split(TOOL_NAME_SPLIT)[0];

      const plugin = await ToolPlugin.get(pluginId);

      /** 执行工具  */
      const toolResult = await plugin.execute(toolName, query);

      /* 返回工具调用结果 */
      return {
        name: tool_call.function.name,
        arguments: query,
        result: toolResult,
      };
    } catch (error) {
      return {
        name: tool_call.function.name,
        arguments: tool_call.function.arguments,
        result: { error },
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
      }
      /* 添加新的消息容器 */
      this.historyMessage.push([
        {
          role: "assistant",
          content: "",
          type: MessageType.ASSISTANT_PENDING,
          created_at: Date.now(),
        },
      ]);

      /* 创建请求体 */
      let requestBody: ChatModelRequestBody = {
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

      // 允许子类修改请求体
      requestBody = this.prepareRequestBody(requestBody);

      let reasonerContent = "";
      // 监听流式响应事件
      const unlistenStream = await cmd.listen(
        `chat-stream-${this.currentRequestId}`,
        (event) => {
          if (!event.payload) return;
          // 解析原始响应数据
          const {
            content: deltaContent,
            reasoner,
            tool_call,
          } = this.parseResponseBody(event.payload);

          if (deltaContent) {
            if (reasonerContent) {
              reasonerContent = "";
              this.historyMessage.push([
                {
                  role: "assistant",
                  content: "",
                  type: MessageType.ASSISTANT_PENDING,
                  created_at: Date.now(),
                },
              ]);
            }

            content += deltaContent;
            this.historyMessage.updateLastMessage({
              content,
              type: config.assistant,
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

          // 如果有推理内容，可以在这里处理
          if (reasoner) {
            reasonerContent += reasoner;
            this.historyMessage.updateLastMessage({
              content: reasonerContent,
              type: MessageType.ASSISTANT_REASONING,
            });
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
