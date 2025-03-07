import { NodeResult, NodeState, NodeType, WorkflowNode } from "../types/nodes";

export class NodeExecutor {
  /** 执行器注册表 */
  private static readonly executors = new Map<
    NodeType,
    new (
      node: WorkflowNode,
      updateNodeState: (update: Partial<NodeState>) => void,
    ) => NodeExecutor
  >();

  /** 注册节点执行器 */
  public static register(
    type: NodeType,
    executorClass: new (
      node: WorkflowNode,
      updateNodeState: (update: Partial<NodeState>) => void,
    ) => NodeExecutor,
  ) {
    NodeExecutor.executors.set(type, executorClass);
  }

  /** 获取已注册的执行器类型 */
  public static getRegisteredTypes(): NodeType[] {
    return Array.from(NodeExecutor.executors.keys());
  }

  /** 根据节点类型创建对应的执行器实例 */
  public static create(
    node: WorkflowNode,
    updateNodeState: (update: Partial<NodeState>) => void,
  ): NodeExecutor {
    if (!node.type) {
      throw new Error("节点类型不能为空");
    }

    const ExecutorClass = NodeExecutor.executors.get(node.type);
    console.log(
      `节点类型 ${node.type} 的执行器:`,
      ExecutorClass ? "找到" : "未找到",
    );
    /* 如果未找到对应的执行器，则使用默认的执行器 */
    if (!ExecutorClass) {
      return new NodeExecutor(node, updateNodeState);
    }
    return new ExecutorClass(node, updateNodeState);
  }

  constructor(
    protected node: WorkflowNode,
    protected updateNodeState: (update: Partial<NodeState>) => void,
  ) {}

  public async execute(inputs: Record<string, any>) {
    const node = this.node;
    if (!node || !node.type) {
      return this.createErrorResult("无效的节点配置");
    }

    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs: inputs || {},
      });

      let result: NodeResult = {
        success: true,
        data: {
          result: "执行成功",
        },
      };

      this.updateNodeState({
        status: "completed",
        outputs: result.data || {},
        endTime: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      console.error(`===== 节点 ${node.id} 执行出错 =====`);
      console.error(error);
      this.updateNodeState({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        endTime: new Date().toISOString(),
      });

      return this.createErrorResult(error);
    }
  }

  /** 解析输入引用 */
  protected parseTextFromInputs(
    text: string,
    inputs: Record<WorkflowNode["id"], any>,
  ) {
    if (!text) return "";

    try {
      const result = text.replace(/\{\{inputs\.([^}]+)\}\}/g, (match, path) => {
        if (!path) return match;

        const parts = path.split(".");
        let value = inputs;

        for (const part of parts) {
          if (value === undefined || value === null) {
            console.warn(`解析输入引用失败: ${path} 的 ${part} 部分不存在`);
            return match;
          }
          value = value[part];
        }

        if (value === undefined || value === null) {
          console.warn(`解析输入引用失败: ${path} 的值为空`);
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
      return result;
    } catch (error) {
      console.error("解析输入引用出错:", error);
      return text;
    }
  }

  /** 创建统一的错误返回对象 */
  protected createErrorResult(error: unknown): NodeResult {
    console.error("创建错误返回对象", error);
    this.updateNodeState({
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
