import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbShape3, TbUpload } from "react-icons/tb";
import { Workflow } from "./execute/Workflow";
import { WorkflowEditor } from "./WorkflowEditor";
import { WorkflowManager } from "./WorkflowManager";
import { cmd } from "@/utils/shell";
/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = WorkflowManager.use();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const handleWorkflowSelect = (id: string) => {
    setSelectedWorkflow(id === selectedWorkflow ? null : id);
    Workflow.instance.init(id);
  };

  const handleCreateWorkflow = async () => {
    const workflow = await Workflow.create();
    workflow.register();
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        left={
          <Button
            onClick={() => {
              cmd.invoke("open_url", {
                url: "https://ghostie.wangenius.com/resources/workflows",
              });
            }}
            variant="outline"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            工作流仓库
          </Button>
        }
        right={
          <>
            <Button className="flex-1" onClick={handleCreateWorkflow}>
              <TbPlus className="w-4 h-4 mr-2" />
              新建工作流
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {}}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>导入</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>导出</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="工作流支持:
            通过可视化编排的方式创建和管理自动化工作流。支持多种节点类型和条件分支。
          "
        items={Object.entries(workflows).map(([id, workflow]) => ({
          id,
          title: workflow.name || "未命名工作流",
          description: workflow.description || "暂无描述",
          onClick: () => handleWorkflowSelect(id),
          actived: selectedWorkflow === id,
          onRemove: () => {
            WorkflowManager.delete(id);
            if (selectedWorkflow === id) {
              setSelectedWorkflow(null);
            }
          },
        }))}
      />

      {/* 右侧编辑器区域 */}
      <PreferenceBody
        emptyText="请选择一个工作流或点击新建按钮创建工作流"
        EmptyIcon={TbShape3}
        isEmpty={!selectedWorkflow}
      >
        <WorkflowEditor />
      </PreferenceBody>
    </PreferenceLayout>
  );
}
