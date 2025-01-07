import { invoke } from "@tauri-apps/api/core";
import { Echo } from "../utils/Echo";

export interface Plugin {
  name: string;
  description?: string;
  script_content: string;
  enabled: boolean;
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
      const plugins = await invoke<Plugin[]>("list_js_plugins");
      this.state.set({ list: plugins });
    } catch (error) {
      console.error("加载插件失败:", error);
    } finally {
      this.state.set({ loading: false });
    }
  }

  static async addPlugin(name: string, scriptContent: string) {
    await invoke("add_js_plugin", { name, scriptContent });
    await this.loadPlugins();
  }

  static async removePlugin(name: string) {
    await invoke("remove_js_plugin", { name });
    await this.loadPlugins();
  }

  static async getPlugin(name: string) {
    return await invoke<Plugin>("get_js_plugin", { name });
  }

  static async updatePlugin(oldName: string, plugin: Plugin) {
    await invoke("update_js_plugin", { oldName, plugin });
    await this.loadPlugins();
  }

  static async runPlugin(name: string) {
    try {
      const plugin = await this.getPlugin(name);
      const fn = new Function(plugin.script_content);
      const result = await fn();
      return result;
    } catch (error) {
      console.error("执行脚本失败:", error);
      throw error;
    }
  }
}
