import { Toolkit } from "@/toolkit/Toolkit";
import { ToolkitMarketProps } from "@/toolkit/types";
import { supabase } from "@/utils/supabase";
import { UserMananger } from "@/services/user/User";
import { toJS } from "mobx";

export class ToolkitCloudManager {
  static async fetchMarketData(
    page: number = 1,
    limit: number = 10,
  ): Promise<ToolkitMarketProps[]> {
    // Get current page data
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    const { data, error } = await supabase
      .from("plugins")
      .select("*")
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) {
      throw JSON.stringify(error);
    }
    return (data as ToolkitMarketProps[]) || [];
  }

  static async installFromMarket(data: ToolkitMarketProps) {
    const plugin = await Toolkit.create({
      id: data.id,
      name: data.name,
      description: data.description,
      version: data.version,
    });
    await plugin.updateContent(data.content.trim());
    return plugin;
  }

  static async uninstallFromMarket(id: string) {
    const { error } = await supabase.from("plugins").delete().eq("id", id);
    if (error) {
      throw JSON.stringify(error);
    }
  }

  /** 检查插件是否已存在且属于当前用户 */
  static async checkPluginExists(pluginId: string): Promise<boolean> {
    // 检查是否已经有了相同id和user_id的插件
    const { data } = await supabase
      .from("plugins")
      .select("id, user_id")
      .eq("id", pluginId);

    // 获取当前用户ID
    const currentUser = UserMananger.store.current;
    const currentUserId = currentUser?.id;

    console.log(data, currentUser);

    // 如果存在相同id的插件，且属于当前用户，则返回true
    if (data && data.length > 0) {
      const existingPlugin = data[0];
      return existingPlugin.user_id === currentUserId;
    }

    return false;
  }

  /** 上传插件到市场 */
  static async uploadToMarket(plugin: Toolkit) {
    // 获取当前用户ID
    const currentUser = UserMananger.store.current;
    const currentUserId = currentUser?.id;

    if (!currentUserId) {
      throw new Error("用户未登录，无法上传插件");
    }

    // 检查插件是否已存在且属于当前用户
    const isUpdate = await this.checkPluginExists(plugin.props.id);

    // 如果存在且属于当前用户，则执行更新操作
    if (isUpdate) {
      return await this.updateFromMarket(plugin);
    }

    // 检查是否存在相同ID但不同用户的插件
    const { data } = await supabase
      .from("plugins")
      .select("id")
      .eq("id", plugin.props.id);

    if (data && data.length > 0) {
      // 存在相同ID但不同用户的插件，抛出错误
      throw new Error("plugin with this id already exists by another user");
    }

    // 插件不存在，执行新增操作
    const { error } = await supabase.from("plugins").insert({
      id: plugin.props.id,
      name: plugin.props.name,
      description: plugin.props.description,
      content: plugin.content,
      version: plugin.props.version,
      user_id: currentUserId,
    });

    if (error) {
      throw JSON.stringify(error);
    }
    return;
  }

  static async updateFromMarket(plugin: Toolkit) {
    console.log(toJS(plugin));
    try {
      const { error } = await supabase
        .from("plugins")
        .update({
          name: plugin.props.name,
          description: plugin.props.description,
          content: plugin.content,
          version: plugin.props.version,
        })
        .eq("id", plugin.props.id);
      if (error) {
        throw JSON.stringify(error);
      }
    } catch (error) {
      console.error("updateFromMarket error:", error);
    }
    return;
  }
}
