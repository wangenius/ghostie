
import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Avatar from "boring-avatars";
import { useEffect, useState } from "react";
import {
  TbCheck,
  TbChevronLeft,
  TbChevronRight,
  TbDownload,
  TbLoader2,
  TbRefresh,
  TbSearch,
  TbTrash,
} from "react-icons/tb";
import { toast } from "sonner";

interface AgentDetailsPanelProps {
  agent: any;
  onClose: () => void;
  onInstall: (agent: any) => void;
  onDelete: (agent: any) => void;
  isInstalled: boolean;
  isDeleting: boolean;
  isInstalling: boolean;
  isOwner: boolean;
}

const AgentDetailsPanel = ({
  agent,
  onClose,
  onInstall,
  onDelete,
  isInstalled,
  isDeleting,
  isInstalling,
  isOwner,
}: AgentDetailsPanelProps) => {
  return (
    <div className="flex flex-col gap-4 p-2">
      {/* 描述部分 */}
      <div className="bg-muted/50 p-4 rounded-lg">
        <div className="max-h-[300px] overflow-y-auto rounded p-3">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {agent.description || "无描述"}
          </p>
        </div>
      </div>

      {/* 模型配置信息 */}
      <div className="bg-muted rounded-xl p-4 shadow-sm">
        <h4 className="text-sm font-medium mb-3">模型配置</h4>
        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {agent.body.models?.text && (
            <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
              <div className="font-medium text-sm min-w-[100px] text-primary">
                文本模型:
              </div>
              <div className="text-sm text-muted-foreground">
                {agent.body.models.text.name || "未指定"}
              </div>
            </div>
          )}
          {agent.body.models?.vision && (
            <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
              <div className="font-medium text-sm min-w-[100px] text-primary">
                视觉模型:
              </div>
              <div className="text-sm text-muted-foreground">
                {agent.body.models.vision.name || "未指定"}
              </div>
            </div>
          )}
          {agent.body.tools && agent.body.tools.length > 0 && (
            <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
              <div className="font-medium text-sm min-w-[100px] text-primary">
                工具数量:
              </div>
              <div className="text-sm text-muted-foreground">
                {agent.body.tools.length}
              </div>
            </div>
          )}
          {agent.body.mcps && agent.body.mcps.length > 0 && (
            <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
              <div className="font-medium text-sm min-w-[100px] text-primary">
                MCP数量:
              </div>
              <div className="text-sm text-muted-foreground">
                {agent.body.mcps.length}
              </div>
            </div>
          )}
          {agent.body.engine && (
            <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
              <div className="font-medium text-sm min-w-[100px] text-primary">
                引擎类型:
              </div>
              <div className="text-sm text-muted-foreground">
                {agent.body.engine}
              </div>
            </div>
          )}

          <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
            <div className="font-medium text-sm min-w-[100px] text-primary">
              版本:
            </div>
            <div className="text-sm text-muted-foreground">
              {agent.version || "1.0"}
            </div>
          </div>
          <div className="flex gap-2 p-1 bg-muted/40 rounded-lg">
            <div className="font-medium text-sm min-w-[100px] text-primary">
              创建时间:
            </div>
            <div className="text-sm text-muted-foreground">
              {new Date(agent.inserted_at).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex justify-end gap-2 mt-2">
        {isOwner && (
          <Button
            variant="destructive"
            className="flex items-center gap-1"
            onClick={() => {
              onClose();
              onDelete(agent);
            }}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <TbLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TbTrash className="w-4 h-4" />
            )}
            删除
          </Button>
        )}
        {!isInstalled && (
          <Button
            className="flex items-center gap-1"
            onClick={() => {
              onClose();
              onInstall(agent);
            }}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <TbLoader2 className="w-4 h-4 animate-spin" />
            ) : (
              <TbDownload className="w-4 h-4" />
            )}
            安装
          </Button>
        )}
        {isInstalled && (
          <Button className="flex items-center gap-1" disabled>
            <TbCheck className="w-4 h-4" />
            已安装
          </Button>
        )}
      </div>
    </div>
  );
};

export const AgentsMarketTab = () => {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const user = null;
  const CurrentAgents = {};

  // 从 Supabase 获取机器人列表 - 分页处理
  const fetchAgents = async (page = 1) => {
    try {
      setLoading(true);
      const data = [];
      setAgents(data);
      setCurrentPage(page);
      // 如果获取的项目数少于itemsPerPage，说明没有下一页
      setHasNextPage((data?.length || 0) >= 10);
    } catch (error) {
      console.error("Get agents list failed:", error);
    } finally {
      setLoading(false);
    }
  };

  // 安装机器人
  const handleInstall = async (agent: any) => {
    try {
      setInstalling(agent.id);
      toast.success(`Successfully installed agent: ${agent.name}`);
    } catch (error) {
      console.error("Install agent failed:", error);
      toast.error(`Install agent failed: ${error}`);
    } finally {
      setInstalling(null);
    }
  };

  // 删除机器人
  const handleDelete = async (agent: any) => {
    try {
      setDeleting(agent.id);

      // 更新当前页数据
      fetchAgents(currentPage);
      toast.success(`Successfully deleted agent: ${agent.name}`);
    } catch (error) {
      console.error("Delete agent failed:", error);
      toast.error(`Delete agent failed: ${error}`);
    } finally {
      setDeleting(null);
    }
  };

  // 显示机器人详情
const showAgentDetails = (agent: any) => {
    dialog({
      title: agent.name,
      description: agent.version,
      className: "md:max-w-[600px]",
      content: (close) => (
        <AgentDetailsPanel
          agent={agent}
          onClose={close}
          onInstall={handleInstall}
          onDelete={handleDelete}
          isInstalled={!!CurrentAgents[agent.id]}
          isDeleting={deleting === agent.id}
          isInstalling={installing === agent.id}
          isOwner={false}
        />
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
          (agent.body.system || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : agents;

  return (
    <div className="h-full max-h-full w-full flex flex-col gap-3">
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
            <span>加载机器人中...</span>
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
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex-1 flex items-center gap-2">
                      <Avatar
                        size={32}
                        name={agent.id}
                        variant="beam"
                        colors={[
                          "#92A1C6",
                          "#146A7C",
                          "#F0AB3D",
                          "#C271B4",
                          "#C20D90",
                        ]}
                        square={false}
                      />
                      <h3 className="font-medium text-sm text-card-foreground flex items-center gap-1.5">
                        {agent.name}
                      </h3>
                    </div>
                    <div className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {new Date(agent.inserted_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3 flex-grow">
                    {agent.description || "无描述"}
                  </p>

                  <div className="flex justify-between items-center mt-auto pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      点击查看详情
                    </div>
                    {!CurrentAgents[agent.id] && (
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
                    )}
                    {!!CurrentAgents[agent.id] && (
                      <Button className="flex items-center gap-1" disabled>
                        <TbCheck className="w-4 h-4" />
                        已安装
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <div className="text-4xl mb-4">🔍</div>
            <p>未找到匹配的机器人</p>
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
