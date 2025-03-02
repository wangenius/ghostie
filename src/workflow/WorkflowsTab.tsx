import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbDownload,
  TbPlus,
  TbShape3,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { Workflow } from "./Workflow";
import { WorkflowEditor } from "./WorkflowEditor";
import { WorkflowManager } from "./WorkflowManager";
import { EditorContextProvider } from "./context/EditorContext";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = WorkflowManager.use();
  const [selectedWorkflow, setSelectedWorkflow] = useState<string | null>(null);

  const handleWorkflowSelect = (id: string) => {
    setSelectedWorkflow(id === selectedWorkflow ? null : id);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-[400px] bg-muted flex flex-col h-full overflow-auto rounded-xl p-2 gap-2">
        <div className="flex-none flex justify-end items-center">
          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              onClick={async () => {
                const workflow = new Workflow();
                workflow.register();
              }}
            >
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
          </div>
        </div>

        <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            工作流支持:
            通过可视化编排的方式创建和管理自动化工作流。支持多种节点类型和条件分支。
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 p-1">
          {Object.entries(workflows).length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
              <TbShape3 className="w-12 h-12 text-muted-foreground/50" />
              <p className="text-center">
                暂无工作流，点击上方按钮创建新的工作流
              </p>
            </div>
          ) : (
            Object.entries(workflows).map(([id, workflow]) => (
              <div
                key={id}
                className={`group relative px-4 py-3 rounded-lg transition-all hover:bg-muted-foreground/10 select-none cursor-pointer ${
                  selectedWorkflow === id
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : "bg-background"
                }`}
                onClick={() => handleWorkflowSelect(id)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">
                        {workflow.name || "未命名工作流"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {workflow.description || "暂无描述"}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      WorkflowManager.delete(id);
                      if (selectedWorkflow === id) {
                        setSelectedWorkflow(null);
                      }
                    }}
                  >
                    <TbTrash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 右侧编辑器区域 */}
      <div className="flex-1 min-w-0 h-full overflow-hidden">
        {selectedWorkflow ? (
          <EditorContextProvider id={selectedWorkflow}>
            <WorkflowEditor />
          </EditorContextProvider>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
              <TbShape3 className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">选择或创建工作流</h3>
            <p className="text-sm text-muted-foreground">
              从左侧列表中选择一个工作流进行编辑，或点击新建按钮创建工作流
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
