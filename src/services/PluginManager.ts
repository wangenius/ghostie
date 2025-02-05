import { invoke } from "@tauri-apps/api/core";
import { Echo } from "echo-state";

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

interface PluginState {
  list: Plugin[];
  loading: boolean;
}

export class PluginManager {
  static state = new Echo<PluginState>({
    list: [],
    loading: false,
  });

  static use = this.state.use.bind(this.state);

  static async loadPlugins() {
    try {
      this.state.set({ loading: true });
      const plugins = await invoke<Plugin[]>("list_plugins");
      this.state.set({ list: plugins });
    } catch (error) {
      console.error("加载插件失败:", error);
    } finally {
      this.state.set({ loading: false });
    }
  }

  static async addPlugin(plugin: Plugin) {
    await invoke("add_plugin", { plugin });
    await this.loadPlugins();
  }

  static async removePlugin(name: string) {
    await invoke("remove_plugin", { name });
    await this.loadPlugins();
  }

  static async getPlugin(name: string) {
    return await invoke<Plugin>("get_plugin", { name });
  }

  static async updatePlugin(oldName: string, plugin: Plugin) {
    await invoke("update_plugin", { oldName, plugin });
    await this.loadPlugins();
  }

  static async runPlugin(name: string, args?: Record<string, string>) {
    try {
      const result = await invoke("execute_plugin", { name, args });
      return result;
    } catch (error) {
      console.error("执行脚本失败:", error);
      throw error;
    }
  }
}
