import { PluginMarketProps, PluginProps } from "@/common/types/plugin";
import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { TbLoader2 } from "react-icons/tb";
import { PluginManager } from "../PluginManager";

export const PluginsMarket = () => {
  const [plugins, setPlugins] = useState<PluginMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  // 从 Supabase 获取插件列表
  const fetchPlugins = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("plugins")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setPlugins(data || []);
    } catch (error) {
      console.error("failed to fetch plugins:", error);
      cmd.message("failed to fetch plugins", "error");
    } finally {
      setLoading(false);
    }
  };

  // 安装插件
  const handleInstall = async (plugin: PluginMarketProps) => {
    try {
      setInstalling(plugin.id);

      // 导入插件
      await cmd.invoke<PluginMarketProps>("plugin_import", {
        content: plugin.content.trim(),
      });

      /* 获取工具列表 */
      const plugins = await cmd.invoke<Record<string, PluginProps>>(
        "plugins_list",
      );
      PluginManager.set(plugins);

      cmd.message(`success install plugin: ${plugin.name}`, "success");
    } catch (error) {
      console.error("failed to install plugin:", error);
      cmd.message(
        `failed to install plugin: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setInstalling(null);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchPlugins();
  }, []);

  return (
    <div className="h-[80vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchPlugins}
            disabled={loading}
          >
            {loading ? "loading..." : "refresh"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin mr-2">
            <TbLoader2 className="w-5 h-5" />
          </div>
          <span>loading plugins...</span>
        </div>
      ) : plugins.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plugins.map((plugin) => (
            <div key={plugin.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{plugin.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {plugin.description}
                  </p>
                  <div className="text-xs text-gray-400 mt-2">
                    version: {plugin.version} · author: {plugin.author}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleInstall(plugin)}
                  disabled={installing === plugin.id}
                >
                  {installing === plugin.id ? (
                    <>
                      <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                      installing
                    </>
                  ) : (
                    "install"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          no plugins or failed to load
        </div>
      )}
    </div>
  );
};
