import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { TbLoader2 } from "react-icons/tb";
import { Workflow } from "../execute/Workflow";

// 创建 Supabase 客户端
const supabase = createClient(
  "https://iwuvrfojrkclhcxfcjzy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dXZyZm9qcmtjbGhjeGZjanp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTA0NDIsImV4cCI6MjA1ODk4NjQ0Mn0.L_VhFwjH1wO2KyqdUBruc1O0AH78mP-2mIkdQwTyak8",
);

interface WorkflowMarketProps {
  id: string;
  name: string;
  description: string;
  data: any;
  inserted_at: string;
  updated_at: string;
  author?: string;
}

export const WorkflowsMarket = () => {
  const [workflows, setWorkflows] = useState<WorkflowMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

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
      console.error("获取工作流列表失败:", error);
      cmd.message("获取工作流列表失败", "error");
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
        await newWorkflow.updateBody(workflow.data.body);
      }

      cmd.message(`成功安装工作流: ${workflow.name}`, "success");
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
            {loading ? "加载中..." : "刷新"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin mr-2">
            <TbLoader2 className="w-5 h-5" />
          </div>
          <span>加载工作流...</span>
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
                  <div className="text-xs text-gray-400 mt-2">
                    作者: {workflow.author || "未知"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleInstall(workflow)}
                  disabled={installing === workflow.id}
                >
                  {installing === workflow.id ? (
                    <>
                      <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                      安装中...
                    </>
                  ) : (
                    "安装"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          没有可用的工作流或加载失败
        </div>
      )}
    </div>
  );
};
