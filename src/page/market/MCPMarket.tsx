import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MCP } from "@/page/mcp/MCP";
import { UserMananger } from "@/services/user/User";
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

interface MCPMarketProps {
  id: string;
  name: string;
  user_id: string;
  server: string;
  description: string;
  type: "stdio" | "sse";
  created_at: string;
  updated_at: string;
}

export const MCPMarket = () => {
  const [mcps, setMcps] = useState<MCPMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;
  const user = UserMananger.use();

  // Fetch plugins from Supabase - paginated
  const fetchMcps = async (page = 1) => {
    try {
      setLoading(true);

      // Get current page data
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error } = await supabase
        .from("mcp")
        .select("*")
        .order("created_at", { ascending: false })
        .range(start, end);

      if (error) {
        throw error;
      }

      setMcps(data || []);
      setCurrentPage(page);

      // If we got less items than itemsPerPage, there's no next page
      setHasNextPage((data?.length || 0) >= itemsPerPage);
    } catch (error) {
      console.error("Failed to fetch mcps:", error);
      cmd.message("Failed to fetch mcps", "error");
    } finally {
      setLoading(false);
    }
  };

  // Install plugin
  const handleInstall = async (mcp: MCPMarketProps) => {
    try {
      setInstalling(mcp.id);
      console.log(mcp);
      await MCP.create({
        name: mcp.name,
        description: mcp.description,
        server: mcp.server,
      });

      cmd.message(`成功安装MCP: ${mcp.name}`, "success");
    } catch (error) {
      console.error("Failed to install mcp:", error);
      cmd.message(
        `安装MCP失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setInstalling(null);
    }
  };

  // Delete plugin
  const handleDelete = async (mcp: MCPMarketProps) => {
    try {
      setDeleting(mcp.id);
      const { error } = await supabase.from("mcp").delete().eq("id", mcp.id);

      if (error) {
        throw error;
      }

      // Update current page data
      fetchMcps(currentPage);
      cmd.message(`成功删除MCP: ${mcp.name}`, "success");
    } catch (error) {
      console.error("Failed to delete plugin:", error);
      cmd.message(
        `删除MCP失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setDeleting(null);
    }
  };

  // Show plugin details
  const showMCPDetails = (mcp: MCPMarketProps) => {
    dialog({
      title: mcp.name,
      className: "md:max-w-[600px]",
      content: (close) => (
        <div className="flex flex-col gap-4 p-2">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">MCP描述</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {mcp.description}
            </p>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            {user?.id === mcp.user_id && (
              <Button
                variant="destructive"
                className="flex items-center gap-1"
                onClick={() => {
                  close();
                  handleDelete(mcp);
                }}
                disabled={deleting === mcp.id}
              >
                {deleting === mcp.id ? (
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
                handleInstall(mcp);
              }}
              disabled={installing === mcp.id}
            >
              {installing === mcp.id ? (
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
      fetchMcps(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchMcps(currentPage - 1);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMcps(1);
  }, []);

  const filteredMcps = searchQuery
    ? mcps.filter(
        (mcp) =>
          mcp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          mcp.description.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : mcps;

  return (
    <div className="h-full max-h-full w-full flex flex-col gap-3">
      {/* Header with search */}
      <div className="flex-none">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pl-4">
          <h2 className="text-lg font-semibold">MCP Market</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto max-w-[300px]">
            <div className="relative flex-1">
              <TbSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search mcps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchMcps(1)}
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
            <span>加载MCP中...</span>
          </div>
        ) : filteredMcps.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredMcps.map((mcp) => (
              <div
                key={mcp.id}
                className="border rounded-xl p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => showMCPDetails(mcp)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm text-card-foreground flex items-center gap-1.5">
                      <span className="bg-primary/10 text-primary p-1 rounded">
                        <TbInfoCircle className="w-3.5 h-3.5" />
                      </span>
                      {mcp.name}
                    </h3>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3 flex-grow">
                    {mcp.description}
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
                        handleInstall(mcp);
                      }}
                      disabled={installing === mcp.id}
                    >
                      {installing === mcp.id ? (
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
            <p>未找到匹配的MCP</p>
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
      {filteredMcps.length > 0 && !searchQuery && (
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
