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
            Workflows Market
          </Button>
        }
        right={
          <>
            <Button className="flex-1" onClick={handleCreateWorkflow}>
              <TbPlus className="w-4 h-4 mr-2" />
              New Workflow
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
                  <span>Import</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {}}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="Workflows supported: Create and manage automated workflows through visual orchestration. Supports multiple node types and conditional branches."
        items={Object.entries(workflows).map(([id, workflow]) => ({
          id,
          title: workflow.name || "Unnamed Workflow",
          description: workflow.description || "No description",
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
        emptyText="Please select a workflow or click the new button to create a workflow"
        EmptyIcon={TbShape3}
        isEmpty={!selectedWorkflow}
      >
        <WorkflowEditor />
      </PreferenceBody>
    </PreferenceLayout>
  );
}
