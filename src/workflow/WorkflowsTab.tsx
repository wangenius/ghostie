import { dialog } from "@/components/custom/DialogModal";
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
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbShape3, TbUpload } from "react-icons/tb";
import { WorkflowsMarket } from "./components/WorkflowsMarket";
import { WorkflowUpload } from "./components/WorkflowUpload";
import { ContextWorkflow, Workflow } from "./execute/Workflow";
import { WorkflowEditor } from "./WorkflowEditor";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = Workflow.list.use();
  const contextWorkflowId = ContextWorkflow.use((selector) => selector.meta.id);
  const handleWorkflowSelect = (id: string) => {
    ContextWorkflow.switch(id);
  };

  const handleCreateWorkflow = async () => {
    await Workflow.create();
  };

  const handleOpenMarket = () => {
    dialog({
      title: "工作流市场",
      content: <WorkflowsMarket />,
      className: "max-w-3xl",
    });
  };

  const handleOpenUpload = () => {
    dialog({
      title: "上传工作流",
      content: (close) => <WorkflowUpload close={close} />,
      closeIconHide: true,
    });
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        left={
          <Button onClick={handleOpenMarket} variant="outline">
            <PiStorefrontDuotone className="w-4 h-4" />
            工作流市场
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
                <DropdownMenuItem onClick={handleOpenUpload}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>上传工作流</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>导出工作流</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="支持的工作流：通过可视化编排创建和管理自动化工作流。支持多种节点类型和条件分支。"
        items={Object.entries(workflows).map(([id, workflow]) => ({
          id,
          title: workflow.name || "未命名工作流",
          description: workflow.description || "无描述",
          onClick: () => handleWorkflowSelect(id),
          actived: contextWorkflowId === id,
          onRemove: () => {
            Workflow.delete(id);
            if (contextWorkflowId === id) {
              ContextWorkflow.close();
            }
          },
        }))}
      />

      {/* 右侧编辑器区域 */}
      <PreferenceBody
        emptyText="请选择一个工作流或点击新建按钮创建工作流"
        EmptyIcon={TbShape3}
        isEmpty={!contextWorkflowId}
      >
        <WorkflowEditor />
      </PreferenceBody>
    </PreferenceLayout>
  );
}
