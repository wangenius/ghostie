import { Bot } from "@/bot/Bot";
import { ChatModel } from "@/model/ChatModel";
import { cmd } from "@/utils/shell";
import { ExpressionEvaluator } from "./ExpressionEvaluator";
import { WorkflowEdge } from "./types/edges";
import {
  BotNodeConfig,
  BranchNodeConfig,
  PluginNodeConfig,
  WorkflowNode,
} from "./types/nodes";

export class WorkflowExecutor {
  private nodes: WorkflowNode[];
  private edges: WorkflowEdge[];
  private context: Record<string, any>;
  private evaluator: ExpressionEvaluator;

  constructor(nodes: WorkflowNode[], edges: WorkflowEdge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.context = {};
    this.evaluator = new ExpressionEvaluator();
  }

  private findStartNode(): WorkflowNode | undefined {
    return this.nodes.find((node) => node.data.type === "start");
  }

  private findNextNodes(currentNode: WorkflowNode): WorkflowNode[] {
    const outgoingEdges = this.edges.filter(
      (edge) => edge.source === currentNode.id
    );

    return outgoingEdges
      .filter((edge) => {
        if (edge.data?.condition) {
          return this.evaluator.evaluate(edge.data.condition, this.context);
        }
        return true;
      })
      .map((edge) => this.nodes.find((node) => node.id === edge.target))
      .filter((node): node is WorkflowNode => node !== undefined);
  }

  private async executeChatNode(node: WorkflowNode): Promise<any> {
    const config = node.data.data;
    if (!config?.model)
      throw new Error("Chat node requires model configuration");

    const chatModel = new ChatModel({ model: config.model });
    if (config.system) chatModel.system(config.system);

    const response = await chatModel.stream(config.prompt);
    return { output: response.body };
  }

  private async executeBotNode(node: WorkflowNode): Promise<any> {
    const config = node.data as BotNodeConfig;
    if (!config?.bot) throw new Error("Bot node requires bot configuration");

    const bot = Bot.get(config.bot);
    await bot.chat(config.input || "");
    // 获取最后一条消息内容
    const messages = bot.model.historyMessage.listWithOutType();
    const lastMessage = messages[messages.length - 1];
    return { output: lastMessage?.content || "" };
  }

  private async executePluginNode(node: WorkflowNode): Promise<any> {
    const config = node.data.config as PluginNodeConfig;
    if (!config?.plugin || !config?.tool) {
      throw new Error("Plugin node requires plugin and tool configuration");
    }

    const result = await cmd.invoke("plugin_execute", {
      id: config.plugin,
      tool: config.tool,
      args: config.args || {},
    });

    return { output: result };
  }

  private async executeBranchNode(node: WorkflowNode): Promise<any> {
    const config = node.data.config as BranchNodeConfig;
    if (!config?.conditions) {
      throw new Error("Branch node requires conditions configuration");
    }

    const matchedCondition = config.conditions.find((condition) =>
      this.evaluator.evaluate(condition.expression, this.context)
    );

    return {
      output: matchedCondition?.label || null,
      condition: matchedCondition?.expression || null,
    };
  }

  private async executeNode(node: WorkflowNode): Promise<any> {
    try {
      if (node.data.validate?.() === false) {
        throw new Error(`Node validation failed: ${node.data.label}`);
      }

      let result;
      switch (node.data.type) {
        case "chat":
          result = await this.executeChatNode(node);
          break;
        case "bot":
          result = await this.executeBotNode(node);
          break;
        case "plugin":
          result = await this.executePluginNode(node);
          break;
        case "branch":
          result = await this.executeBranchNode(node);
          break;
        case "start":
          result = { output: "开始执行" };
          break;
        case "end":
          result = { output: "执行完成" };
          break;
        default:
          throw new Error(`Unsupported node type: ${node.data.type}`);
      }

      // 更新上下文
      this.context[node.id] = result;
      return result;
    } catch (error) {
      throw new Error(
        `Node execution failed: ${node.data.label} - ${String(error)}`
      );
    }
  }

  public async execute(initialContext: Record<string, any> = {}): Promise<any> {
    this.context = { ...initialContext };
    const startNode = this.findStartNode();
    if (!startNode) {
      throw new Error("No start node found");
    }

    const executionQueue: WorkflowNode[] = [startNode];
    const executedNodes = new Set<string>();
    const results: Record<string, any> = {};

    while (executionQueue.length > 0) {
      const currentNode = executionQueue.shift()!;

      if (executedNodes.has(currentNode.id)) {
        continue;
      }

      const result = await this.executeNode(currentNode);
      results[currentNode.id] = result;
      executedNodes.add(currentNode.id);

      if (currentNode.data.type === "end") {
        break;
      }

      const nextNodes = this.findNextNodes(currentNode);
      executionQueue.push(...nextNodes);
    }

    return {
      results,
      context: this.context,
    };
  }
}
