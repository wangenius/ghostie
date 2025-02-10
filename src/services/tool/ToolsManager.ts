import { Echo } from "echo-state";
import { ToolFunction, ToolFunctionInfo } from "@common/types/model";
import { Tool } from "./Tool";

export interface Plugin {
  name: string;
  description?: string;
  script_content: string;
  enabled: boolean;
  args: PluginArg[];
  handler?: (...args: any[]) => Promise<any>;
}

export interface PluginArg {
  name: string;
  arg_type: string;
  description: string;
  required: boolean;
  default_value?: string;
}

export class ToolsManager {
  static state = new Echo<Record<string, Plugin>>(
    {},
    {
      name: "tools",
      sync: true,
    }
  );

  static use = this.state.use.bind(this.state);

  // 存储所有工具函数
  private static toolFunctions = new Map<string, ToolFunction>();

  /**
   * 注册工具函数
   */
  static registerTool(tool: ToolFunction) {
    console.log(`正在注册工具: ${tool.info.name}`);

    // 检查工具函数是否已存在
    if (this.toolFunctions.has(tool.info.name)) {
      console.log(`工具 ${tool.info.name} 已存在，跳过注册`);
      return;
    }

    this.toolFunctions.set(tool.info.name, tool);

    // 同时更新到插件状态
    const plugin: Plugin = {
      name: tool.info.name,
      description: tool.info.description,
      script_content: tool.fn.toString(),
      enabled: true,
      args: Object.entries(tool.info.parameters.properties).map(
        ([name, prop]: [string, any]) => ({
          name,
          arg_type: prop.type,
          description: prop.description,
          required: tool.info.parameters.required.includes(name),
          default_value: prop.default,
        })
      ),
    };

    this.state.set({
      [tool.info.name]: plugin,
    });

    console.log(`工具 ${tool.info.name} 注册成功`);
    console.log("当前已注册工具:", Array.from(this.toolFunctions.keys()));
  }

  /**
   * 获取所有工具函数信息
   */
  static getAllTools(): ToolFunctionInfo[] {
    return Array.from(this.toolFunctions.values()).map((tool) => tool.info);
  }

  /**
   * 获取指定工具函数
   */
  static getTool(name: string): ToolFunction | undefined {
    return this.toolFunctions.get(name);
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

  static async add(plugin: Plugin) {
    // 注册为工具函数
    const toolFunction: ToolFunction = {
      info: {
        name: plugin.name,
        description: plugin.description || "",
        parameters: {
          type: "object",
          properties: plugin.args.reduce(
            (acc, arg) => ({
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
          required: plugin.args
            .filter((arg) => arg.required)
            .map((arg) => arg.name),
        },
      },
      fn: plugin.handler || (new Function(plugin.script_content) as any),
    };

    this.registerTool(toolFunction);
  }

  static async delete(name: string) {
    this.toolFunctions.delete(name);
    this.state.delete(name);
  }

  static async update(oldName: string, plugin: Plugin) {
    await this.delete(oldName);
    await this.add(plugin);
  }

  static async run(name: string, args?: Record<string, any>) {
    return await this.executeTool(name, args);
  }
}
