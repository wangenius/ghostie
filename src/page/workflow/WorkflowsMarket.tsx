import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserMananger } from "@/settings/User";
import { Workflow } from "@/workflow/Workflow";
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
import { toast } from "sonner";

export interface WorkflowMarketProps {
  id: string;
  name: string;
  description: string;
  body: any;
  inserted_at: string;
  updated_at: string;
  user_id: string;
}

export const WorkflowsMarket = () => {
  const [workflows, setWorkflows] = useState<WorkflowMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const itemsPerPage = 10;
  const user = UserMananger.use();

  // 从 Supabase 获取工作流列表 - 分页处理
  const fetchWorkflows = async (page = 1) => {
    try {
      setLoading(true);
      const data = await Workflow.fetchFromMarket(page, itemsPerPage);
      setWorkflows(data || []);
      setCurrentPage(page);
      // 如果获取的项目数少于itemsPerPage，说明没有下一页
      setHasNextPage((data?.length || 0) >= itemsPerPage);
    } catch (error) {
      toast.error(`获取工作流列表失败:${error}`);
    } finally {
      setLoading(false);
    }
  };

  // 安装工作流
  const handleInstall = async (workflow: WorkflowMarketProps) => {
    try {
      setInstalling(workflow.id);
      await Workflow.installFromMarket(workflow);
      toast.success(`成功安装工作流: ${workflow.name}`);
    } catch (error) {
      toast.error(`安装工作流失败:${error}`);
    } finally {
      setInstalling(null);
    }
  };

  // 删除工作流
  const handleDelete = async (workflow: WorkflowMarketProps) => {
    try {
      setDeleting(workflow.id);
      await Workflow.uninstallFromMarket(workflow.id);
      // 更新当前页数据
      fetchWorkflows(currentPage);
      toast.success(`成功删除工作流: ${workflow.name}`);
    } catch (error) {
      toast.error(`删除工作流失败:${error}`);
    } finally {
      setDeleting(null);
    }
  };

  // 显示工作流详情
  const showWorkflowDetails = (workflow: WorkflowMarketProps) => {
    dialog({
      title: workflow.name || "未命名工作流",
      description: `更新时间: ${new Date(workflow.updated_at).toLocaleString()}`,
      className: "md:max-w-[600px]",
      content: (close) => (
        <div className="flex flex-col gap-4 p-2">
          <div className="bg-muted/50 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">工作流描述</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {workflow.description || "无描述"}
            </p>
          </div>

          {workflow.body && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="text-lg font-medium mb-2">工作流数据</h3>
              <div className="max-h-[300px] overflow-y-auto rounded p-3">
                一共有 {Object.keys(workflow.body.nodes).length}
                个节点
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-2">
            {user?.id === workflow.user_id && (
              <Button
                variant="destructive"
                className="flex items-center gap-1"
                onClick={() => {
                  close();
                  handleDelete(workflow);
                }}
                disabled={deleting === workflow.id}
              >
                {deleting === workflow.id ? (
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
                handleInstall(workflow);
              }}
              disabled={installing === workflow.id}
            >
              {installing === workflow.id ? (
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

  // 页面导航
  const handleNextPage = () => {
    if (hasNextPage) {
      fetchWorkflows(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchWorkflows(currentPage - 1);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchWorkflows(1);
  }, []);

  const filteredWorkflows = searchQuery
    ? workflows.filter(
        (workflow) =>
          (workflow.name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (workflow.description || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()),
      )
    : workflows;

  return (
    <div className="h-[600px] max-h-full w-full flex flex-col gap-3">
      {/* 标题栏与搜索 */}
      <div className="flex-none">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pl-4">
          <h2 className="text-lg font-semibold">Workflows Market</h2>
          <div className="flex items-center gap-2 w-full sm:w-auto max-w-[300px]">
            <div className="relative flex-1">
              <TbSearch className="absolute left-2 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="搜索工作流..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchWorkflows(1)}
              disabled={loading}
              className="h-9"
            >
              {loading ? (
                <TbLoader2 className="w-4 h-4 animate-spin" />
              ) : (
                <TbRefresh className="w-4 h-4" />
              )}
              <span className="ml-1 hidden sm:inline">刷新</span>
            </Button>
          </div>
        </div>
      </div>

      {/* 内容区域 - 工作流卡片 */}
      <div className="flex-grow overflow-auto px-2">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin mr-2">
              <TbLoader2 className="w-6 h-6" />
            </div>
            <span>加载工作流中...</span>
          </div>
        ) : filteredWorkflows.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWorkflows.map((workflow) => (
              <div
                key={workflow.id}
                className="border rounded-xl p-4 bg-card hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => showWorkflowDetails(workflow)}
              >
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-sm text-card-foreground flex items-center gap-1.5">
                      <span className="bg-primary/10 text-primary p-1 rounded">
                        <TbInfoCircle className="w-3.5 h-3.5" />
                      </span>
                      {workflow.name || "未命名工作流"}
                    </h3>
                    <div className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                      {new Date(workflow.updated_at).toLocaleDateString()}
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground line-clamp-1 mb-3 flex-grow">
                    {workflow.description || "无描述"}
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
                        handleInstall(workflow);
                      }}
                      disabled={installing === workflow.id}
                    >
                      {installing === workflow.id ? (
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
            <p>未找到匹配的工作流</p>
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
      {filteredWorkflows.length > 0 && !searchQuery && (
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
