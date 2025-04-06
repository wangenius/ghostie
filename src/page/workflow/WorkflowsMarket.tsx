import { Button } from "@/components/ui/button";
import { supabase } from "@/utils/supabase";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import { TbLoader2, TbTrash } from "react-icons/tb";
import { UserMananger } from "@/settings/User";
import { Workflow } from "@/workflow/Workflow";
import { Echo } from "echo-state";
import { WORKFLOW_BODY_DATABASE } from "@/workflow/const";

export interface WorkflowMarketProps {
  id: string;
  name: string;
  description: string;
  data: any;
  inserted_at: string;
  updated_at: string;
  user_id: string;
}

export const WorkflowsMarket = () => {
  const [workflows, setWorkflows] = useState<WorkflowMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const user = UserMananger.use();

  // 从 Supabase 获取工作流列表
  const fetchWorkflows = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("inserted_at", { ascending: false });

      if (error) {
        throw error;
      }

      setWorkflows(data || []);
    } catch (error) {
      console.error("failed to get workflow market list:", error);
      cmd.message("failed to get workflow market list", "error");
    } finally {
      setLoading(false);
    }
  };

  // 安装工作流
  const handleInstall = async (workflow: WorkflowMarketProps) => {
    try {
      setInstalling(workflow.id);

      // 添加到工作流管理器
      const newWorkflow = await Workflow.create();

      // 更新工作流元数据和内容
      await newWorkflow.updateMeta({
        name: workflow.name,
        description: workflow.description,
      });

      // 更新工作流主体数据
      if (workflow.data && workflow.data.body) {
        new Echo(workflow.data.body)
          .indexed({
            database: WORKFLOW_BODY_DATABASE,
            name: newWorkflow.meta.id,
          })
          .ready();
      }

      cmd.message(`success to install: ${workflow.name}`, "success");
    } catch (error) {
      console.error("安装工作流失败:", error);
      cmd.message(
        `安装工作流失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setInstalling(null);
    }
  };

  // 删除工作流
  const handleDelete = async (workflow: WorkflowMarketProps) => {
    try {
      setDeleting(workflow.id);
      const { error } = await supabase
        .from("workflows")
        .delete()
        .eq("id", workflow.id);

      if (error) {
        throw error;
      }

      setWorkflows(workflows.filter((w) => w.id !== workflow.id));
      cmd.message(`成功删除工作流: ${workflow.name}`, "success");
    } catch (error) {
      console.error("删除工作流失败:", error);
      cmd.message(
        `删除工作流失败: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setDeleting(null);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchWorkflows();
  }, []);

  return (
    <div className="h-[80vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchWorkflows}
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
          <span>loading workflows...</span>
        </div>
      ) : workflows.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">
                    {workflow.name || "未命名工作流"}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {workflow.description?.slice(0, 100) || "无描述"}
                    {(workflow.description?.length || 0) > 100 ? "..." : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleInstall(workflow)}
                    disabled={installing === workflow.id}
                  >
                    {installing === workflow.id ? (
                      <>
                        <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                        installing...
                      </>
                    ) : (
                      "install"
                    )}
                  </Button>
                  {user?.id === workflow.user_id && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(workflow)}
                      disabled={deleting === workflow.id}
                    >
                      {deleting === workflow.id ? (
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
        <div className="text-center py-8 text-gray-500">No workflow</div>
      )}
    </div>
  );
};
