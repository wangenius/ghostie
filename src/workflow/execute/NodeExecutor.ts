import { Bot } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { ChatModel } from "@/model/ChatModel";
import { ModelManager } from "@/model/ModelManager";
import { PluginManager } from "@/plugin/PluginManager";
import { cmd } from "@/utils/shell";
import {
  BotNodeConfig,
  BranchNodeConfig,
  ChatNodeConfig,
  CodeNodeConfig,
  IteratorNodeConfig,
  MessageNodeConfig,
  NodeResult,
  NodeState,
  PluginNodeConfig,
  WorkflowNode,
} from "../types/nodes";

export class NodeExecutor {
  constructor(
    private updateNodeState: (
      nodeId: string,
      update: Partial<NodeState>,
    ) => void,
  ) {}

  /** 解析输入引用 */
  private parseTextFromInputs(
    text: string,
    inputs: Record<WorkflowNode["id"], any>,
  ) {
    console.log("解析输入引用:", text);
    console.log("可用输入:", inputs);

    const result = text.replace(/\{\{inputs\.([^}]+)\}\}/g, (match, path) => {
      const parts = path.split(".");
      let value = inputs;
      for (const part of parts) {
        if (value === undefined || value === null) {
          return match;
        }
        value = value[part];
      }

      if (value === undefined || value === null) {
        return JSON.stringify(value);
      }

      switch (typeof value) {
        case "object":
          return JSON.stringify(value, null, 2);
        case "string":
          return value;
        default:
          return String(value);
      }
    });

    console.log("解析结果:", result);
    return result;
  }

  /** 执行开始节点 */
  private async executeStartNode(
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    return {
      success: true,
      data: inputs,
    };
  }

  /** 执行结束节点 */
  private async executeEndNode(
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    return {
      success: true,
      data: inputs,
    };
  }

  private async executePanelNode(
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    return {
      success: true,
      data: inputs,
    };
  }

  private async executeChatNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const chatConfig = node.data as ChatNodeConfig;
    const parsedSystem = this.parseTextFromInputs(chatConfig.system, inputs);
    const parsedUser = this.parseTextFromInputs(chatConfig.user, inputs);
    const res = await new ChatModel(ModelManager.get(chatConfig.model))
      .system(parsedSystem)
      .stream(parsedUser);
    return {
      success: true,
      data: {
        result: res.body,
      },
    };
  }

  private async executeBotNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const botConfig = node.data as BotNodeConfig;
    const bot = new Bot(BotManager.get(botConfig.bot));
    const parsedPrompt = this.parseTextFromInputs(
      botConfig.prompt || "",
      inputs,
    );
    const botResult = await bot.chat(parsedPrompt);
    return {
      success: true,
      data: {
        result: botResult.content,
      },
    };
  }

  private async executePluginNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const pluginConfig = node.data as PluginNodeConfig;
    const plugin = PluginManager.get(pluginConfig.plugin);
    if (!plugin) {
      throw new Error(`插件不存在: ${pluginConfig.plugin}`);
    }
    const tool = plugin.tools.find((t) => t.name === pluginConfig.tool);
    if (!tool) {
      throw new Error(`工具不存在: ${pluginConfig.tool}`);
    }

    const processedArgs = Object.entries(pluginConfig.args || {}).reduce(
      (acc, [key, value]) => ({
        ...acc,
        [key]:
          typeof value === "string"
            ? this.parseTextFromInputs(value, inputs)
            : value,
      }),
      {},
    );

    const pluginResult = await cmd.invoke("plugin_execute", {
      id: plugin.id,
      tool: pluginConfig.tool,
      args: processedArgs,
    });
    return {
      success: true,
      data: {
        result: pluginResult,
      },
    };
  }

  /** 创建统一的错误返回对象 */
  private createErrorResult(error: unknown): NodeResult {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }

  private async executeCodeNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const codeConfig = node.data as CodeNodeConfig;
    const code = codeConfig.code;

    try {
      const context = {
        inputs,
        console: {
          log: (...args: any[]) => console.log(...args),
          error: (...args: any[]) => console.error(...args),
        },
      };

      const functionBody = `
        "use strict";
        const {inputs, console} = arguments[0];
        ${code}
      `;

      const executeFn = new Function(functionBody);
      const result = await executeFn(context);

      return {
        success: true,
        data: {
          result: result,
        },
      };
    } catch (error) {
      console.error("Code execution error:", error);
      return this.createErrorResult(error);
    }
  }

  private async executeIteratorNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    try {
      const iteratorConfig = node.data as IteratorNodeConfig;
      const result = inputs[iteratorConfig.target];
      return {
        success: true,
        data: {
          result: result,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  private async executeMessageNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    try {
      const messageConfig = node.data as MessageNodeConfig;
      const message = this.parseTextFromInputs(
        messageConfig.message || "",
        inputs,
      );
      const success = await cmd.notify(message);
      return {
        success: success,
        data: {
          result: message,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }

  private async executeBranchNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const data = node.data as BranchNodeConfig;
    console.log("branch node", data);
    return {
      success: true,
      data: inputs,
    };
  }

  public async executeNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    try {
      this.updateNodeState(node.id, {
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      let result: NodeResult;

      switch (node.type) {
        case "start":
          result = await this.executeStartNode(inputs);
          break;
        case "end":
          result = await this.executeEndNode(inputs);
          break;
        case "panel":
          result = await this.executePanelNode(inputs);
          break;
        case "chat":
          result = await this.executeChatNode(node, inputs);
          break;
        case "bot":
          result = await this.executeBotNode(node, inputs);
          break;
        case "plugin":
          result = await this.executePluginNode(node, inputs);
          break;
        case "branch":
          result = await this.executeBranchNode(node, inputs);
          break;
        case "code":
          result = await this.executeCodeNode(node, inputs);
          break;
        case "iterator":
          result = await this.executeIteratorNode(node, inputs);
          break;
        case "message":
          result = await this.executeMessageNode(node, inputs);
          break;
        default:
          throw new Error(`不支持的节点类型: ${node.type}`);
      }

      if (!result.success) {
        throw new Error(result.error);
      }

      this.updateNodeState(node.id, {
        status: "completed",
        outputs: result.data,
        endTime: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.updateNodeState(node.id, {
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        endTime: new Date().toISOString(),
      });

      return this.createErrorResult(error);
    }
  }
}
