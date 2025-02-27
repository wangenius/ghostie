import { Echo } from "echo-state";
import { PluginProps } from "@/common/types/plugin";

export class PluginManager {
  /* 插件列表 */
  static store = new Echo<Record<string, PluginProps>>(
    {},
    {
      name: "plugins",
      sync: true,
    },
  );

  static get current() {
    return this.store.current;
  }
  static use = this.store.use.bind(this.store);
  static set = this.store.set.bind(this.store);
  static delete = this.store.delete.bind(this.store);
  static get(id: string) {
    return this.store.current[id];
  }
}
