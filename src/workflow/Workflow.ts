import { Bot } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { ChatModel } from "@/model/ChatModel";
import { ModelManager } from "@/model/ModelManager";
import { PluginManager } from "@/plugin/PluginManager";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
import { ExpressionEvaluator } from "./ExpressionEvaluator";
import { WorkflowEdge } from "./types/edges";
import {
  BotNodeConfig,
  BranchNodeConfig,
  ChatNodeConfig,
  FilterNodeConfig,
  NodeConfig,
  NodeResult,
  NodeState,
  NodeType,
  PluginNodeConfig,
  WorkflowNode,
  WorkflowProps,
} from "./types/nodes";
import { WorkflowManager } from "./WorkflowManager";

/* 初始化节点 */
const initialNodes: Record<string, WorkflowNode> = {
  start: {
    id: "start",
    type: "start",
    name: "开始",
    data: {
      type: "start",
      name: "开始",
      inputs: {},
      outputs: {},
    },
    position: { x: 0, y: 0 },
  },
  end: {
    id: "end",
    type: "end",
    name: "结束",
    data: {
      type: "end",
      name: "结束",
      inputs: {},
      outputs: {},
    },
    position: { x: 850, y: 0 },
  },
};
const initialEdges: Record<string, WorkflowEdge> = {};

const INITIAL_WORKFLOW: WorkflowProps = {
  id: "",
  name: "",
  description: "",
  createdAt: "",
  updatedAt: "",
  nodes: initialNodes,
  edges: initialEdges,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};

/* 工作流 */
export class Workflow {
  private state = new Echo<{
    data: WorkflowProps;
    nodeStates: Record<string, NodeState>;
    executedNodes: Set<string>;
    isExecuting: boolean;
  }>(
    {
      data: INITIAL_WORKFLOW,
      nodeStates: {},
      executedNodes: new Set(),
      isExecuting: false,
    },
    {
      onChange: (state, oldState) => {
        if (state.data.id === oldState.data.id) {
          WorkflowManager.update(state.data);
        }
      },
    },
  );

  use = this.state.use.bind(this.state);
  set = this.state.set.bind(this.state);

  /* 全局工作流实例,用来在编辑器中使用 */
  static instance = new Workflow();

  get current() {
    return this.state.current;
  }

  /** 注册工作流，创建一个新的id */
  register() {
    const id = gen.id();
    this.state.set((state) => {
      return {
        ...state,
        data: { ...state.data, id },
      };
    });
    WorkflowManager.create(this.state.current.data);
    return id;
  }

  // 获取所有节点
  public getNodes(): WorkflowNode[] {
    return Object.values(this.state.current.data?.nodes || {});
  }

  // 获取所有边
  public getEdges() {
    return Object.values(this.state.current.data?.edges || {});
  }

  // 更新节点数据
  public updateNode(nodeId: string, data: any) {
    this.state.set((state) => {
      if (!state.data) return state;

      const node = state.data.nodes[nodeId];
      if (!node) return state;

      const updatedNode = {
        ...node,
        data: {
          ...node.data,
          ...data,
        },
      };

      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [nodeId]: updatedNode,
          },
        },
      };
    });
  }

  // 更新节点位置
  public updateNodePosition(
    nodeId: string,
    position: { x: number; y: number },
  ) {
    this.state.set((state) => {
      if (!state.data) return state;

      const node = state.data.nodes[nodeId];
      if (!node) return state;

      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [nodeId]: {
              ...state.data.nodes[nodeId],
              position,
            },
          },
        },
      };
    });
  }

  // 添加节点
  public addNode(type: NodeType, position: { x: number; y: number }) {
    const baseData = {
      type,
      name: type,
      inputs: {},
      outputs: {},
    };

    let nodeData: NodeConfig;
    switch (type) {
      case "start":
      case "end":
        nodeData = { ...baseData } as NodeConfig;
        break;
      case "chat":
        nodeData = {
          ...baseData,
          model: "",
          system: "",
        } as ChatNodeConfig;
        break;
      case "bot":
        nodeData = {
          ...baseData,
          bot: "",
        } as BotNodeConfig;
        break;
      case "plugin":
        nodeData = {
          ...baseData,
          plugin: "",
          tool: "",
          args: {},
        } as PluginNodeConfig;
        break;
      case "branch":
        nodeData = {
          ...baseData,
          conditions: [],
        } as BranchNodeConfig;
        break;
      case "filter":
        nodeData = {
          ...baseData,
          filter: {
            group: {
              conditions: [],
              id: gen.id(),
              type: "AND",
              isEnabled: true,
            },
          },
        } as FilterNodeConfig;
        break;
      default:
        nodeData = baseData as NodeConfig;
    }

    const newNode: WorkflowNode = {
      id: gen.id(),
      type,
      name: type,
      position,
      data: nodeData,
    };

    this.state.set((state) => {
      if (!state.data) return state;
      return {
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [newNode.id]: newNode,
          },
        },
        nodeStates: {
          ...state.nodeStates,
          [newNode.id]: {
            status: "pending",
            inputs: {},
            outputs: {},
          },
        },
      };
    });
  }

  // 添加边
  public addEdge(edge: any) {
    this.state.set((state) => {
      if (!state.data) return state;

      return {
        ...state,
        data: {
          ...state.data,
          edges: {
            ...state.data.edges,
            [edge.id]: edge,
          },
        },
      };
    });
  }

  // 删除节点
  public removeNode(nodeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;

      const { [nodeId]: _, ...remainingNodes } = state.data.nodes;
      const { [nodeId]: __, ...remainingNodeStates } = state.nodeStates;
      return {
        ...state,
        data: {
          ...state.data,
          nodes: remainingNodes,
        },
        nodeStates: remainingNodeStates,
      };
    });
  }

  // 删除边
  public removeEdge(edgeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;

      const { [edgeId]: _, ...remainingEdges } = state.data.edges;
      return {
        ...state,
        data: {
          ...state.data,
          edges: remainingEdges,
        },
      };
    });
  }

  /** 创建工作流实例 */
  static async create(workflowId?: string): Promise<Workflow> {
    const workflow = new Workflow();
    await workflow.init(workflowId);
    return workflow;
  }

  /** 初始化工作流 */
  constructor() {
    // 构造函数中不再调用异步的 init
  }

  /** 初始化工作流 */
  public async init(workflowId?: string): Promise<Workflow> {
    /* 初始化，将工作流数据设置到state中 */
    const workflow = workflowId
      ? (await WorkflowManager.get(workflowId)) ?? INITIAL_WORKFLOW
      : INITIAL_WORKFLOW;

    // 设置工作流数据和初始状态
    this.state.set(
      {
        data: workflow,
        nodeStates: {},
        executedNodes: new Set(),
        isExecuting: false,
      },
      { replace: true },
    );

    /* 初始化节点状态 */
    this.initNodeStates(workflow);
    return this;
  }

  /** 初始化节点状态 */
  private initNodeStates(workflow: WorkflowProps) {
    let states: Record<string, NodeState> = {};

    /* 初始化节点状态 */
    Object.values(workflow.nodes).forEach((node) => {
      let initialOutputs = {};
      // 根据节点类型初始化默认输出结构
      switch (node.type) {
        case "start":
          // start节点的输出就是它的inputs
          initialOutputs = node.data.inputs || {};
          break;
        case "chat":
          // chat节点的输出包含result字段
          initialOutputs = { result: null };
          break;
        case "bot":
          // bot节点的输出结构
          initialOutputs = { result: null };
          break;
        case "branch":
          // branch节点的输出是选中的条件
          initialOutputs = { selectedCondition: null };
          break;
        case "end":
          // end节点的输出是所有输入的汇总
          initialOutputs = {};
          break;
        case "panel":
          // panel节点的输出是所有输入的汇总
          initialOutputs = {};
          break;
        default:
          initialOutputs = { result: null };
      }

      states[node.id] = {
        inputs: {},
        outputs: initialOutputs,
        status: "pending",
      };
    });

    /* 设置节点状态 */
    this.state.set((prev) => ({
      ...prev,
      nodeStates: states,
    }));
  }

  private getNodeState(nodeId: string): NodeState {
    const state = this.state.current.nodeStates[nodeId];
    if (!state) {
      throw new Error(`节点状态不存在: ${nodeId}`);
    }
    return state;
  }

  private updateNodeState(nodeId: string, update: Partial<NodeState>) {
    const currentState = this.getNodeState(nodeId);
    this.state.set((state) => ({
      ...state,
      nodeStates: {
        ...state.nodeStates,
        [nodeId]: {
          ...currentState,
          ...update,
          // 保持现有的outputs结构，只更新提供的字段
          outputs: {
            ...currentState.outputs,
            ...(update.outputs || {}),
          },
        },
      },
    }));
  }

  private collectNodeInputs(
    nodeId: string,
    predecessors: Map<string, Set<string>>,
  ): Record<string, any> {
    const inputs: Record<string, Record<string, any>> = {};

    if (nodeId === "start") {
      return this.current.data!.nodes[nodeId].data.inputs;
    }

    // 获取所有前置节点
    const prevNodes = predecessors.get(nodeId) || new Set();

    // 收集所有前置节点的输出
    prevNodes.forEach((prevId) => {
      // 每次都重新获取最新的节点状态
      const prevState = this.getNodeState(prevId);
      const prevNode = this.current.data!.nodes[prevId];

      // 跳过skipped状态的节点
      if (prevState.status === "skipped") {
        return;
      }

      if (prevState.status === "completed") {
        // 对于分支节点的特殊处理
        if (prevNode.type === "branch") {
          // 只收集满足条件的分支输出
          const branchOutput = prevState.outputs;
          if (
            branchOutput &&
            this.shouldFollowBranch(prevId, nodeId, branchOutput)
          ) {
            inputs[prevId] = branchOutput;
          }
        } else {
          // 其他节点以节点ID为key存储输出
          inputs[prevId] = prevState.outputs;
        }
      }
    });

    return inputs;
  }

  private shouldFollowBranch(
    branchId: string,
    targetId: string,
    branchOutput: any,
  ): boolean {
    // 每次都重新获取最新的节点数据
    const node = this.current.data!.nodes[branchId];
    if (!node || node.type !== "branch") return true;

    const selectedCondition = branchOutput;

    // 检查目标节点是否是选中的分支
    const edge = Object.values(this.current.data!.edges).find(
      (e) => e.source === branchId && e.target === targetId,
    ) as WorkflowEdge & { condition?: string };

    return edge?.condition === selectedCondition?.id;
  }

  private parseInputReferences(text: string, inputs: Record<string, any>) {
    console.log(text);
    console.log(inputs);

    const result = text.replace(
      /\{\{inputs\.([^.]+)\.([^}]+)\}\}/g,
      (match, nodeId, key) => {
        const nodeInputs = inputs[nodeId];
        if (!nodeInputs) return match;
        const value = nodeInputs[key];

        // 处理不同类型的值
        if (value === null || value === undefined) {
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
      },
    );
    console.log(result);
    return result;
  }

  private async executeStartNode(
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    return {
      success: true,
      data: inputs,
    };
  }

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
    const parsedSystem = this.parseInputReferences(chatConfig.system, inputs);
    const parsedUser = this.parseInputReferences(chatConfig.user, inputs);
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
    const parsedPrompt = this.parseInputReferences(
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

  /** 执行插件节点
   *  @param node - 插件节点
   *  @param inputs - 插件节点的输入
   *  @returns 插件节点的执行结果
   */
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
            ? this.parseInputReferences(value, inputs)
            : value,
      }),
      {},
    );

    console.log(processedArgs);

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

  private async executeBranchNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const branchConfig = node.data as BranchNodeConfig;
    const evaluator = new ExpressionEvaluator();
    const matchedCondition = branchConfig.conditions.find((condition) =>
      evaluator.evaluate(condition.expression, inputs),
    );
    return {
      success: true,
      data: matchedCondition || branchConfig.conditions[0],
    };
  }

  private evaluateCondition(condition: any, item: any): boolean {
    const { field, operator, value, dataType } = condition;
    let itemValue = item[field];

    if (field.includes(".")) {
      const parts = field.split(".");
      itemValue = parts.reduce(
        (obj: Record<string, any>, part: string) => obj?.[part],
        item,
      );
    }

    if (itemValue === undefined) {
      return operator === "notExists";
    }

    let typedValue: any;
    let typedItemValue: any;

    switch (dataType) {
      case "number":
        typedValue = Number(value);
        typedItemValue = Number(itemValue);
        break;
      case "boolean":
        typedValue = value.toLowerCase() === "true";
        typedItemValue = Boolean(itemValue);
        break;
      case "date":
        typedValue = new Date(value);
        typedItemValue = new Date(itemValue);
        break;
      default:
        typedValue = String(value);
        typedItemValue = String(itemValue);
    }

    switch (operator) {
      case "equals":
        return typedItemValue === typedValue;
      case "notEquals":
        return typedItemValue !== typedValue;
      case "contains":
        return String(typedItemValue).includes(String(typedValue));
      case "notContains":
        return !String(typedItemValue).includes(String(typedValue));
      case "startsWith":
        return String(typedItemValue).startsWith(String(typedValue));
      case "endsWith":
        return String(typedItemValue).endsWith(String(typedValue));
      case "greaterThan":
        return typedItemValue > typedValue;
      case "lessThan":
        return typedItemValue < typedValue;
      case "greaterThanOrEqual":
        return typedItemValue >= typedValue;
      case "lessThanOrEqual":
        return typedItemValue <= typedValue;
      case "matches":
        try {
          const regex = new RegExp(value);
          return regex.test(String(typedItemValue));
        } catch {
          return false;
        }
      case "in":
        const valueList = value.split(",").map((v: string) => v.trim());
        return valueList.includes(String(typedItemValue));
      case "notIn":
        const excludeList = value.split(",").map((v: string) => v.trim());
        return !excludeList.includes(String(typedItemValue));
      case "exists":
        return itemValue !== undefined;
      case "notExists":
        return itemValue === undefined;
      default:
        return false;
    }
  }

  private evaluateGroup(group: any, item: any): boolean {
    if (!group.conditions || group.conditions.length === 0) {
      return true;
    }

    const results = group.conditions.map((condition: any) => {
      if ("operator" in condition) {
        return this.evaluateCondition(condition, item);
      } else {
        return this.evaluateGroup(condition, item);
      }
    });

    return group.type === "AND"
      ? results.every(Boolean)
      : results.some(Boolean);
  }

  private async executeFilterNode(
    node: WorkflowNode,
    inputs: Record<string, any>,
  ): Promise<NodeResult> {
    const filterConfig = node.data as FilterNodeConfig;
    const inputData = Object.values(inputs)[0]?.result;

    if (!inputData || !Array.isArray(inputData)) {
      throw new Error("过滤节点的输入数据必须是数组");
    }

    const filteredData = inputData.filter((item) => {
      return this.evaluateGroup(filterConfig.filter.group, item);
    });

    return {
      success: true,
      data: filteredData,
    };
  }

  private async executeNode(node: WorkflowNode): Promise<NodeResult> {
    try {
      // 构建图结构以获取前置节点
      const { predecessors } = this.buildExecutionGraph();
      // 收集前置节点的输出作为当前节点的输入
      const inputs = this.collectNodeInputs(node.id, predecessors);

      // 更新节点状态
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
        case "filter":
          result = await this.executeFilterNode(node, inputs);
          break;
        default:
          throw new Error(`不支持的节点类型: ${node.type}`);
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

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  deleteNode(nodeId: string) {
    this.state.set((state) => {
      if (!state.data) return state;
      const { [nodeId]: __, ...remainingNodes } = state.data.nodes;
      const { [nodeId]: _, ...remainingNodeStates } = state.nodeStates;
      return {
        ...state,
        data: { ...state.data, nodes: remainingNodes },
        nodeStates: remainingNodeStates,
      };
    });
  }
  /* 执行工作流 */
  public async execute(): Promise<NodeResult> {
    try {
      // 构建图结构
      const graph = this.buildExecutionGraph();

      // 重置执行状态
      this.state.set((state) => ({
        ...state,
        executedNodes: new Set(),
        nodeStates: this.initializeNodeStates(graph),
        isExecuting: true,
      }));

      // 从start节点开始执行
      const startNode = this.current.data!.nodes["start"];
      if (!startNode) {
        throw new Error("工作流缺少开始节点");
      }

      // 执行工作流
      await this.executeGraph(graph);

      // 获取end节点的结果
      const endState = this.getNodeState("end");

      this.state.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      console.log(this.current);

      return {
        success: true,
        data: endState.outputs,
      };
    } catch (error) {
      this.state.set((state) => ({
        ...state,
        isExecuting: false,
      }));

      return {
        success: false,
        data: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildExecutionGraph() {
    const nodes = this.current.data!.nodes;
    const edges = Object.values(this.current.data!.edges);

    // 构建邻接表
    const graph = new Map<string, Set<string>>();
    // 构建入度表
    const inDegree = new Map<string, number>();
    // 构建前置节点表
    const predecessors = new Map<string, Set<string>>();

    // 初始化图结构
    Object.keys(nodes).forEach((nodeId) => {
      graph.set(nodeId, new Set());
      inDegree.set(nodeId, 0);
      predecessors.set(nodeId, new Set());
    });

    // 建立连接关系
    edges.forEach((edge) => {
      graph.get(edge.source)?.add(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      predecessors.get(edge.target)?.add(edge.source);
    });

    return {
      graph,
      inDegree,
      predecessors,
    };
  }

  private async executeGraph(graph: {
    graph: Map<string, Set<string>>;
    inDegree: Map<string, number>;
    predecessors: Map<string, Set<string>>;
  }) {
    const { graph: adjacencyList, inDegree, predecessors } = graph;

    // 只从start节点开始执行
    const queue: string[] = ["start"];

    while (queue.length > 0) {
      const currentBatch = [...queue];
      queue.length = 0;

      // 并行执行当前批次的节点
      await Promise.all(
        currentBatch.map(async (nodeId) => {
          // 每次都重新获取最新的节点数据
          const node = this.current.data!.nodes[nodeId];
          if (!node) {
            throw new Error(`节点不存在: ${nodeId}`);
          }

          // 如果节点状态是skipped，直接处理后继节点
          const nodeState = this.getNodeState(nodeId);
          if (nodeState.status === "skipped") {
            // 更新已执行节点集合
            this.state.set((state) => ({
              ...state,
              executedNodes: state.executedNodes.add(nodeId),
            }));

            // 直接处理后继节点
            adjacencyList.get(nodeId)?.forEach((nextId) => {
              const newDegree = inDegree.get(nextId)! - 1;
              inDegree.set(nextId, newDegree);

              if (newDegree === 0) {
                queue.push(nextId);
              }
            });
            return;
          }

          // 收集前置节点的输出作为当前节点的输入
          this.collectNodeInputs(nodeId, predecessors);

          // 执行节点
          const result = await this.executeNode(node);

          if (!result.success) {
            throw new Error(`节点 ${nodeId} 执行失败: ${result.error}`);
          }

          // 更新节点状态
          this.updateNodeState(nodeId, {
            status: "completed",
            outputs: result.data,
            endTime: new Date().toISOString(),
          });

          // 更新已执行节点集合
          this.state.set((state) => ({
            ...state,
            executedNodes: state.executedNodes.add(nodeId),
          }));

          // 更新后继节点的入度，并检查是否可以执行
          adjacencyList.get(nodeId)?.forEach((nextId) => {
            const newDegree = inDegree.get(nextId)! - 1;
            inDegree.set(nextId, newDegree);

            // 对于 end 节点的特殊处理：只要有一个前置节点完成就更新显示
            if (nextId === "end") {
              const endNode = this.current.data!.nodes[nextId];
              if (endNode) {
                this.executeNode(endNode);
              }
              return;
            }

            // 检查所有前置节点是否都已执行完成或被跳过
            const allPredecessorsCompleted = Array.from(
              predecessors.get(nextId) || [],
            ).every((predId) => {
              const status = this.state.current.nodeStates[predId]?.status;
              return status === "completed" || status === "skipped";
            });

            // 只有当入度为0且所有前置节点都执行完成或被跳过时，才加入队列
            if (newDegree === 0 && allPredecessorsCompleted) {
              queue.push(nextId);
            }
          });
        }),
      );
    }
  }

  public getExecutionState() {
    return {
      nodeStates: this.state.current.nodeStates,
      executedNodes: Array.from(this.state.current.executedNodes),
    };
  }

  // 确定节点的初始状态
  private initializeNodeStates(graph: {
    graph: Map<string, Set<string>>;
    inDegree: Map<string, number>;
    predecessors: Map<string, Set<string>>;
  }): Record<string, NodeState> {
    const { predecessors } = graph;
    const nodeStates: Record<string, NodeState> = {};

    // 首先标记所有节点为pending
    Object.keys(this.current.data!.nodes).forEach((nodeId) => {
      nodeStates[nodeId] = {
        inputs: {},
        outputs: {},
        status: "pending",
      };
    });

    // 特殊处理start节点
    nodeStates["start"].status = "pending";

    // 遍历所有节点，检查是否应该被标记为skipped
    Object.keys(this.current.data!.nodes).forEach((nodeId) => {
      if (nodeId === "start") return;

      const prevNodes = predecessors.get(nodeId) || new Set();

      // 如果节点没有前置节点（除了start节点），或者所有前置节点都是skipped，则标记为skipped
      if (
        prevNodes.size === 0 ||
        Array.from(prevNodes).every(
          (prevId) =>
            nodeId !== "end" && // end节点即使没有入边也不应该被skip
            nodeStates[prevId]?.status === "skipped",
        )
      ) {
        nodeStates[nodeId].status = "skipped";
      }
    });

    return nodeStates;
  }
}
