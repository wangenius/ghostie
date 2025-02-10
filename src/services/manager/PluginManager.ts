import { Echo } from 'echo-state';

export interface Plugin {
  name: string;
  description?: string;
  script_content: string;
  enabled: boolean;
  args: PluginArg[];
}

export interface PluginArg {
  name: string;
  arg_type: string;
  description: string;
  required: boolean;
  default_value?: string;
}

export class PluginManager {
  static state = new Echo<Record<string, Plugin>>(
    {},
    {
      name: 'plugin',
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
      //   const plugin = this.state.get(name);
    } catch (error) {
      console.error('执行脚本失败:', error);
      throw error;
    }
  }
}
