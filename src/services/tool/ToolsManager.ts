import { Echo } from "echo-state";

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
      name: "plugin",
      sync: true,
    }
  );

  static use = this.state.use.bind(this.state);

  static async addPlugin(plugin: Plugin) {
    this.state.set({
      [plugin.name]: plugin,
    });
  }

  static async removePlugin(name: string) {
    this.state.set({
      [name]: undefined,
    });
  }

  static async updatePlugin(oldName: string, plugin: Plugin) {
    this.state.set({
      [oldName]: undefined,
      [plugin.name]: plugin,
    });
  }

  static async runPlugin(name: string, args?: Record<string, string>) {
    try {
      const plugins = this.state.current;
      const plugin = plugins[name];
      if (!plugin) {
        throw new Error(`找不到插件: ${name}`);
      }

      if (!plugin.enabled) {
        throw new Error(`插件 ${name} 已被禁用`);
      }

      if (!plugin.handler) {
        // 如果没有 handler，尝试从 script_content 创建
        const AsyncFunction = Object.getPrototypeOf(
          async function () {}
        ).constructor;
        plugin.handler = new AsyncFunction(plugin.script_content);
      }

      // 验证必需参数
      const missingArgs = plugin.args
        .filter((arg: PluginArg) => arg.required && !args?.[arg.name])
        .map((arg: PluginArg) => arg.name);

      if (missingArgs.length > 0) {
        throw new Error(`缺少必需参数: ${missingArgs.join(", ")}`);
      }

      // 准备参数
      const processedArgs = plugin.args.map((arg: PluginArg) => {
        const value = args?.[arg.name] ?? arg.default_value;
        // 类型转换
        switch (arg.arg_type.toLowerCase()) {
          case "number":
            return Number(value);
          case "boolean":
            return value === "true";
          default:
            return value;
        }
      });

      // 执行插件
      return await plugin.handler!(...processedArgs);
    } catch (error) {
      console.error("执行插件失败:", error);
      throw error;
    }
  }
}
