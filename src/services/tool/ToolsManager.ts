import { cmd } from "@/utils/shell";
import {
  ToolFunction,
  ToolFunctionHandler,
  ToolFunctionInfo,
} from "@common/types/model";
import { Echo } from "echo-state";

export interface Tool {
  name: string;
  description?: string;
  script_content: string;
  enabled: boolean;
  args: ToolArg[];
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
  static async exe(functionCall: {
    name: string;
    arguments: Record<string, any>;
  }): Promise<any> {
    return await ToolsManager.executeTool(
      functionCall.name,
      functionCall.arguments
    );
  }

  /**
   * 获取工具函数信息
   * @param names 工具函数名称
   * @returns 工具函数信息
   */
  static get(names: ToolFunctionHandler[]): ToolFunctionInfo[] {
    return names
      .map((n) => {
        // 如果是字符串或symbol
        if (typeof n === "string" || typeof n === "symbol") {
          return ToolsManager.getTool(n.toString())?.info;
        }

        // 如果是函数或方法
        if (
          typeof n === "function" ||
          (typeof n === "object" && n !== null && typeof n.name === "string")
        ) {
          const name = typeof n === "function" ? n.name : n.name;
          return ToolsManager.getTool(name)?.info;
        }

        return undefined;
      })
      .filter((tool) => tool !== undefined) as ToolFunctionInfo[];
  }
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
      fn: new Function(tool.script_content) as any,
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

  static async remove(name: string) {
    const answer = await cmd.confirm(`确定要删除工具 "${name}" 吗？`);

    if (answer) {
      try {
        await ToolsManager.delete(name);
      } catch (error) {
        console.error("删除插件失败:", error);
      }
    }
  }

  static async importFromJSON() {
    try {
      // 打开文件选择对话框
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择插件文件",
          filters: {
            插件文件: ["json"],
          },
        }
      );

      if (result) {
        // 解析插件文件
        const importedPlugins = JSON.parse(result.content) as Tool[];

        // 导入每个插件
        for (const plugin of importedPlugins) {
          await ToolsManager.add(plugin);
        }

        cmd.message(`成功导入 ${importedPlugins.length} 个插件`, "导入成功");
      }
    } catch (error) {
      console.error("导入插件失败:", error);
      cmd.message(`导入插件失败: ${error}`, "导入失败");
    }
  }

  static async import() {
    try {
      // 打开文件选择对话框
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择工具文件",
          filters: {
            TypeScript文件: ["ts"],
          },
        }
      );

      if (result) {
        try {
          const content = result.content;

          // 解析类名
          const classMatch = content.match(/export\s+class\s+(\w+)/);
          if (!classMatch) {
            throw new Error("未找到工具类定义");
          }
          const className = classMatch[1];

          // 查找所有带装饰器的方法
          const methodRegex =
            /@register\s*\(\s*["'](.+?)["'](?:\s*,\s*({[\s\S]+?}))?\s*\)\s*static\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[^{]+)?\s*{([\s\S]+?)}/g;
          let methodMatch;
          const tools: Tool[] = [];

          while ((methodMatch = methodRegex.exec(content)) !== null) {
            const description = methodMatch[1];
            const argsObject = methodMatch[2]
              ? eval("(" + methodMatch[2] + ")")
              : {};
            const methodName = methodMatch[3];
            const functionBody = methodMatch[4].trim();

            // 构建工具配置
            const tool: Tool = {
              name: `${className}.${methodName}`,
              description: description,
              script_content: `return ${functionBody}`,
              enabled: true,
              args: Object.entries(argsObject).map(
                ([name, prop]: [string, any]) => ({
                  name,
                  arg_type: prop.type,
                  description: prop.description || "",
                  required: prop.required || false,
                  default_value: prop.default,
                })
              ),
            };

            tools.push(tool);
          }

          if (tools.length === 0) {
            throw new Error("未找到有效的工具方法");
          }

          // 添加所有工具
          for (const tool of tools) {
            await ToolsManager.add(tool);
          }

          cmd.message(`成功导入 ${tools.length} 个工具`, "导入成功");
        } catch (error) {
          console.error("解析工具文件失败:", error);
          cmd.message(`解析工具文件失败: ${error}`, "导入失败");
        }
      }
    } catch (error) {
      console.error("导入工具失败:", error);
      cmd.message(`导入工具失败: ${error}`, "导入失败");
    }
  }

  static async exportToJSON() {
    try {
      // 获取所有插件数据
      const toolsToExport = Object.values(this.store.current).filter(Boolean);

      // 转换为 JSON
      const toolsJson = JSON.stringify(toolsToExport, null, 2);

      // 打开保存文件对话框
      const result = await cmd.invoke<boolean>("save_file", {
        title: "保存工具文件",
        filters: {
          工具文件: ["json"],
        },
        defaultName: "tools.json",
        content: toolsJson,
      });

      if (result) {
        cmd.message(`成功导出 ${toolsToExport.length} 个工具`, "导出成功");
      }
    } catch (error) {
      console.error("导出插件失败:", error);
      cmd.message(`导出插件失败: ${error}`, "导出失败");
    }
  }
}
