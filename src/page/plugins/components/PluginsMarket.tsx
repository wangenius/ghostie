import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ToolPlugin } from "@/plugin/ToolPlugin";
import { PluginMarketProps } from "@/plugin/types";
import { UserMananger } from "@/settings/User";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import {
  TbChevronLeft,
  TbChevronRight,
  TbDownload,
  TbInfoCircle,
  TbLoader2,
  TbRefresh,
  TbSearch,
  TbTrash,
} from "react-icons/tb";

export const PluginsMarket = () => {
  const [plugins, setPlugins] = useState<PluginMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;
  const user = UserMananger.use();

  // Fetch plugins from Supabase - paginated
  const fetchPlugins = async (page = 1) => {
    try {
      setLoading(true);

      // Get current page data
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error } = await supabase
        .from("plugins")
        .select("*")
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) {
        throw error;
      }

      setPlugins(data || []);
      setCurrentPage(page);

      // If we got less items than itemsPerPage, there's no next page
      setHasNextPage((data?.length || 0) >= itemsPerPage);
    } catch (error) {
      console.error("Failed to fetch plugins:", error);
      cmd.message("Failed to fetch plugins", "error");
    } finally {
      setLoading(false);
    }
  };

  // Install plugin
  const handleInstall = async (plugin: PluginMarketProps) => {
    try {
      setInstalling(plugin.id);
      const newPlugin = await ToolPlugin.create({
        name: plugin.name,
        description: plugin.description,
      });
      await newPlugin.updateContent(plugin.content.trim());

      cmd.message(`成功安装插件: ${plugin.name}`, "success");
    } catch (error) {
      console.error("Failed to install plugin:", error);
      cmd.message(
        `安装插件失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setInstalling(null);
    }
  };

  // Delete plugin
  const handleDelete = async (plugin: PluginMarketProps) => {
    try {
      setDeleting(plugin.id);
      const { error } = await supabase
        .from("plugins")
        .delete()
        .eq("id", plugin.id);

      if (error) {
        throw error;
      }

      // Update current page data
      fetchPlugins(currentPage);
      cmd.message(`成功删除插件: ${plugin.name}`, "success");
    } catch (error) {
      console.error("Failed to delete plugin:", error);
      cmd.message(
        `删除插件失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setDeleting(null);
    }
  };

  // Show plugin details
  const showPluginDetails = (plugin: PluginMarketProps) => {
    dialog({
      title: plugin.name,
      description: `版本: ${plugin.version}`,
      className: "md:max-w-[600px]",
      content: (close) => (
        <div className="flex flex-col gap-4 p-2">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">插件描述</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {plugin.description}
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">插件代码</h3>
            <div className="max-h-[300px] overflow-y-auto rounded border bg-background p-3">
              <pre className="text-xs whitespace-pre-wrap">
                {plugin.content}
              </pre>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            {user?.id === plugin.user_id && (
              <Button
                variant="destructive"
                className="flex items-center gap-1"
                onClick={() => {
                  close();
                  handleDelete(plugin);
                }}
                disabled={deleting === plugin.id}
              >
                {deleting === plugin.id ? (
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TbTrash className="w-4 h-4" />
                )}
                删除
              </Button>
            )}
            <Button
              className="flex items-center gap-1"
              onClick={() => {
                close();
                handleInstall(plugin);
              }}
              disabled={installing === plugin.id}
            >
              {installing === plugin.id ? (
                <TbLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TbDownload className="w-4 h-4" />
              )}
              安装
            </Button>
          </div>
        </div>
      ),
    });
  };

  // Page navigation
  const handleNextPage = () => {
    if (hasNextPage) {
      fetchPlugins(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchPlugins(currentPage - 1);
    }
  };

  // Initial load
  useEffect(() => {
    fetchPlugins(1);
  }, []);

  const filteredPlugins = searchQuery
    ? plugins.filter(
        (plugin) =>
          plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          plugin.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : plugins;

  return (
    <div className="h-[600px] max-h-full w-full flex flex-col gap-3">
      {/* Header with search */}
      <div className="flex-none">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pl-4">
          <h2 className="text-lg font-semibold">Plugins Market</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto max-w-[300px]">
            <div className="relative flex-1">
              <TbSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search plugins..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPlugins(1)}
              disabled={loading}
              className="h-9"
            >
              {loading ? (
                <TbLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TbRefresh className="w-4 h-4" />
              )}
              <span className="ml-1 hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content area - plugin cards */}
      <div className="flex-grow overflow-auto px-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin mr-2">
              <TbLoader2 className="w-6 h-6" />
            </div>
            <span>加载插件中...</span>
          </div>
        ) : filteredPlugins.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredPlugins.map((plugin) => (
              <div
                key={plugin.id}
                className="border rounded-xl p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => showPluginDetails(plugin)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm text-card-foreground flex items-center gap-1.5">
                      <span className="bg-primary/10 text-primary p-1 rounded">
                        <TbInfoCircle className="w-3.5 h-3.5" />
                      </span>
                      {plugin.name}
                    </h3>
                    <div className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      v{plugin.version}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3 flex-grow">
                    {plugin.description}
                  </p>

                  <div className="flex justify-between items-center mt-auto pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      点击查看详情
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInstall(plugin);
                      }}
                      disabled={installing === plugin.id}
                    >
                      {installing === plugin.id ? (
                        <TbLoader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                      ) : (
                        <TbDownload className="w-3.5 h-3.5 mr-1" />
                      )}
                      安装
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4">🔍</div>
            <p>未找到匹配的插件</p>
            {searchQuery && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setSearchQuery("")}
              >
                清除搜索
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Pagination controls */}
      {filteredPlugins.length > 0 && !searchQuery && (
        <div className="flex-none">
          <div className="flex justify-center items-center h-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
            >
              <TbChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm mx-4">第 {currentPage} 页</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!hasNextPage || loading}
            >
              <TbChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
