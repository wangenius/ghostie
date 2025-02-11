import { Echo } from "echo-state";
import { ToolFunction, ToolFunctionInfo } from "@common/types/model";

export interface Tool {
  name: string;
  description?: string;
  script_content: string;
  enabled: boolean;
  args: ToolArg[];
  handler?: (...args: any[]) => Promise<any>;
}

export interface ToolArg {
  name: string;
  arg_type: string;
  description: string;
  required: boolean;
  default_value?: string;
}

export class ToolsManager {
  /* 保存所有的工具 */
  static store = new Echo<Record<string, Tool>>(
    {},
    {
      name: "tools",
      sync: true,
    }
  );

  static use = this.store.use.bind(this.store);

  // 工具函数执行缓存
  private static toolFunctions = new Map<string, ToolFunction>();

  /**
   * 从store加载工具函数到缓存
   */
  private static loadToolFunction(name: string): ToolFunction | undefined {
    const tools = this.store.current;
    const tool = tools[name];
    if (!tool) return undefined;

    const toolFunction: ToolFunction = {
      info: {
        name: tool.name,
        description: tool.description || "",
        parameters: {
          type: "object",
          properties: tool.args.reduce(
            (acc: Record<string, any>, arg: ToolArg) => ({
              ...acc,
              [arg.name]: {
                type: arg.arg_type,
                description: arg.description,
                required: arg.required,
                default: arg.default_value,
              },
            }),
            {}
          ),
          required: tool.args
            .filter((arg: ToolArg) => arg.required)
            .map((arg: ToolArg) => arg.name),
        },
      },
      fn: tool.handler || (new Function(tool.script_content) as any),
    };

    this.toolFunctions.set(name, toolFunction);
    return toolFunction;
  }

  /**
   * 注册工具函数
   */
  static registerTool(toolFunction: ToolFunction) {
    // 只更新store，不更新缓存
    const tool: Tool = {
      name: toolFunction.info.name,
      description: toolFunction.info.description,
      script_content: toolFunction.fn.toString(),
      enabled: true,
      args: Object.entries(toolFunction.info.parameters.properties).map(
        ([name, prop]: [string, any]) => ({
          name,
          arg_type: prop.type,
          description: prop.description,
          required: toolFunction.info.parameters.required.includes(name),
          default_value: prop.default,
        })
      ),
    };

    this.store.set({
      [toolFunction.info.name]: tool,
    });
  }

  /**
   * 获取所有工具函数信息
   */
  static getAllTools(): ToolFunctionInfo[] {
    // 直接从store中获取
    const tools = this.store.current;
    return Object.values(tools).map((tool) => ({
      name: tool.name,
      description: tool.description || "",
      parameters: {
        type: "object",
        properties: tool.args.reduce(
          (acc: Record<string, any>, arg: ToolArg) => ({
            ...acc,
            [arg.name]: {
              type: arg.arg_type,
              description: arg.description,
              required: arg.required,
              default: arg.default_value,
            },
          }),
          {}
        ),
        required: tool.args
          .filter((arg: ToolArg) => arg.required)
          .map((arg: ToolArg) => arg.name),
      },
    }));
  }

  /**
   * 获取指定工具函数
   */
  static getTool(name: string): ToolFunction | undefined {
    // 先从缓存中查找
    let tool = this.toolFunctions.get(name);
    if (!tool) {
      // 如果缓存中没有，尝试从store中加载
      tool = this.loadToolFunction(name);
    }
    return tool;
  }

  /**
   * 执行工具函数
   */
  static async executeTool(name: string, args: any): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`工具函数 ${name} 不存在`);
    }
    return await tool.fn(args);
  }

  static async add(plugin: Tool) {
    this.store.set({
      [plugin.name]: plugin,
    });
    // 清除缓存
    this.toolFunctions.delete(plugin.name);
  }

  static async delete(name: string) {
    this.toolFunctions.delete(name);
    this.store.delete(name);
  }

  static async update(oldName: string, plugin: Tool) {
    await this.delete(oldName);
    await this.add(plugin);
  }

  static async run(name: string, args?: Record<string, any>) {
    return await this.executeTool(name, args);
  }
}
