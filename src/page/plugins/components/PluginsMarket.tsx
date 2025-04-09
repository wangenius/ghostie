import { Button } from "@/components/ui/button";
import { ToolPlugin } from "@/plugin/ToolPlugin";
import { PluginMarketProps } from "@/plugin/types";
import { UserMananger } from "@/settings/User";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import {
  TbLoader2,
  TbTrash,
  TbChevronLeft,
  TbChevronRight,
} from "react-icons/tb";

export const PluginsMarket = () => {
  const [plugins, setPlugins] = useState<PluginMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 10;
  const user = UserMananger.use();

  // Fetch plugins from Supabase - paginated
  const fetchPlugins = async (page = 1) => {
    try {
      setLoading(true);

      // Get total count
      const countResponse = await supabase
        .from("plugins")
        .select("id", { count: "exact", head: true });

      const total = countResponse.count || 0;
      setTotalCount(total);
      setTotalPages(Math.ceil(total / itemsPerPage));

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

      cmd.message(`Successfully installed plugin: ${plugin.name}`, "success");
    } catch (error) {
      console.error("Failed to install plugin:", error);
      cmd.message(
        `Failed to install plugin: ${
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
      cmd.message(`Successfully deleted plugin: ${plugin.name}`, "success");
    } catch (error) {
      console.error("Failed to delete plugin:", error);
      cmd.message(
        `Failed to delete plugin: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setDeleting(null);
    }
  };

  // Page navigation
  const handleNextPage = () => {
    if (currentPage < totalPages) {
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

  return (
    // Use fixed height container
    <div
      className="h-[600px] max-h-full w-full flex flex-col"
      style={{ minHeight: "200px" }}
    >
      {/* 1. Top toolbar - fixed height */}
      <div className="flex-none h-14 bg-background border-b">
        <div className="flex items-center justify-between h-full px-4">
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchPlugins(1)}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
          <div className="text-sm text-gray-500">
            Total: {totalCount} plugins
          </div>
        </div>
      </div>

      {/* 2. Content area - flexible and scrollable */}
      <div className="flex-grow overflow-auto">
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin mr-2">
                <TbLoader2 className="w-5 h-5" />
              </div>
              <span>Loading plugins...</span>
            </div>
          ) : plugins.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {plugins.map((plugin) => (
                <div key={plugin.id} className="border rounded-lg p-4 bg-card">
                  <div className="flex justify-between items-start">
                    <div className="max-w-[70%]">
                      <h3 className="font-medium text-sm text-card-foreground truncate">
                        {plugin.name}
                      </h3>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {plugin.description}
                      </p>
                      <div className="text-xs text-muted-foreground mt-2">
                        Version: {plugin.version}
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        onClick={() => handleInstall(plugin)}
                        disabled={installing === plugin.id}
                      >
                        {installing === plugin.id ? (
                          <>
                            <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                            Installing
                          </>
                        ) : (
                          "Install"
                        )}
                      </Button>
                      {user?.id === plugin.user_id && (
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => handleDelete(plugin)}
                          disabled={deleting === plugin.id}
                        >
                          {deleting === plugin.id ? (
                            <TbLoader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <TbTrash className="w-4 h-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No plugins found or failed to load
            </div>
          )}
        </div>
      </div>

      {/* 3. Pagination controls - fixed height */}
      {plugins.length > 0 && (
        <div className="flex-none h-14 border-t bg-background">
          <div className="flex justify-center items-center h-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={currentPage === 1 || loading}
            >
              <TbChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm mx-4">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={currentPage === totalPages || loading}
            >
              <TbChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
