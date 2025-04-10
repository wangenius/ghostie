import { AgentMarketProps } from "@/agent/types/agent";
import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import {
  TbLoader2,
  TbTrash,
  TbDownload,
  TbInfoCircle,
  TbSearch,
  TbRefresh,
  TbChevronLeft,
  TbChevronRight,
} from "react-icons/tb";
import { UserMananger } from "@/settings/User";
import { Agent } from "../../agent/Agent";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { dialog } from "@/components/custom/DialogModal";

export const AgentsMarket = () => {
  const [agents, setAgents] = useState<AgentMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;
  const user = UserMananger.use();

  // 从 Supabase 获取机器人列表 - 分页处理
  const fetchAgents = async (page = 1) => {
    try {
      setLoading(true);

      // 获取当前页数据
      const start = (page - 1) * itemsPerPage;
      const end = start + itemsPerPage - 1;

      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("inserted_at", { ascending: false })
        .range(start, end);

      if (error) {
        throw error;
      }

      setAgents(data || []);
      setCurrentPage(page);

      // 如果获取的项目数少于itemsPerPage，说明没有下一页
      setHasNextPage((data?.length || 0) >= itemsPerPage);
    } catch (error) {
      console.error("Get agents list failed:", error);
      cmd.message("Get agents list failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // 安装机器人
  const handleInstall = async (agent: AgentMarketProps) => {
    try {
      setInstalling(agent.id);

      // 添加到机器人管理器
      await Agent.create({
        name: agent.name,
        system: agent.system,
      });

      toast.success(`Successfully installed agent: ${agent.name}`);
    } catch (error) {
      console.error("Install agent failed:", error);
      toast.error(`Install agent failed: ${error}`);
    } finally {
      setInstalling(null);
    }
  };

  // 删除机器人
  const handleDelete = async (agent: AgentMarketProps) => {
    try {
      setDeleting(agent.id);
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", agent.id);

      if (error) {
        throw error;
      }

      // 更新当前页数据
      fetchAgents(currentPage);
      cmd.message(`Successfully deleted agent: ${agent.name}`, "success");
    } catch (error) {
      console.error("Delete agent failed:", error);
      cmd.message(
        `Delete agent failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setDeleting(null);
    }
  };

  // 显示机器人详情
  const showAgentDetails = (agent: AgentMarketProps) => {
    dialog({
      title: agent.name,
      description: `Updated at: ${new Date(agent.inserted_at).toLocaleString()}`,
      className: "md:max-w-[600px]",
      content: (close) => (
        <div className="flex flex-col gap-4 p-2">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">System Prompt</h3>
            <div className="max-h-[300px] overflow-y-auto rounded p-3">
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {agent.system || "No system prompt"}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-2">
            {user?.id === agent.user_id && (
              <Button
                variant="destructive"
                className="flex items-center gap-1"
                onClick={() => {
                  close();
                  handleDelete(agent);
                }}
                disabled={deleting === agent.id}
              >
                {deleting === agent.id ? (
                  <TbLoader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <TbTrash className="w-4 h-4" />
                )}
                Delete
              </Button>
            )}
            <Button
              className="flex items-center gap-1"
              onClick={() => {
                close();
                handleInstall(agent);
              }}
              disabled={installing === agent.id}
            >
              {installing === agent.id ? (
                <TbLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TbDownload className="w-4 h-4" />
              )}
              Install
            </Button>
          </div>
        </div>
      ),
    });
  };

  // 页面导航
  const handleNextPage = () => {
    if (hasNextPage) {
      fetchAgents(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchAgents(currentPage - 1);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchAgents(1);
  }, []);

  const filteredAgents = searchQuery
    ? agents.filter(
        (agent) =>
          agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (agent.system || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : agents;

  return (
    <div className="h-[600px] max-h-full w-full flex flex-col gap-3">
      {/* 标题栏与搜索 */}
      <div className="flex-none">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pl-4">
          <h2 className="text-lg font-semibold">Agents Market</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto max-w-[300px]">
            <div className="relative flex-1">
              <TbSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAgents(1)}
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

      {/* 内容区域 - 机器人卡片 */}
      <div className="flex-grow overflow-auto px-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin mr-2">
              <TbLoader2 className="w-6 h-6" />
            </div>
            <span>Loading agents...</span>
          </div>
        ) : filteredAgents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                className="border rounded-xl p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => showAgentDetails(agent)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm text-card-foreground flex items-center gap-1.5">
                      <span className="bg-primary/10 text-primary p-1 rounded">
                        <TbInfoCircle className="w-3.5 h-3.5" />
                      </span>
                      {agent.name}
                    </h3>
                    <div className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {new Date(agent.inserted_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3 flex-grow">
                    {agent.system || "无系统提示词"}
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
                        handleInstall(agent);
                      }}
                      disabled={installing === agent.id}
                    >
                      {installing === agent.id ? (
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
            <p>No matching agents found</p>
            {searchQuery && (
              <Button
                variant="link"
                className="mt-2"
                onClick={() => setSearchQuery("")}
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>

      {/* 分页控制 */}
      {filteredAgents.length > 0 && !searchQuery && (
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
            <span className="text-sm mx-4">Page {currentPage}</span>
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
