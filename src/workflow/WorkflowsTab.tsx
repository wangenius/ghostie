import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbDownload,
  TbEdit,
  TbPlus,
  TbShape3,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { Workflow } from "./Workflow";
import { WorkflowEditor } from "./WorkflowEditor";
import { WorkflowManager } from "./WorkflowManager";

/* 工作流列表 */
export default function WorkflowsTab() {
  /* 工作流列表 */
  const workflows = WorkflowManager.use();

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              new Workflow().register();
            }}
          >
            <TbPlus className="w-4 h-4 mr-1" />
            <span>新建</span>
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <PiDotsThreeBold className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {}}>
                <TbUpload className="w-4 h-4 mr-2" />
                <span>工作流市场</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {}}>
                <TbDownload className="w-4 h-4 mr-2" />
                <span>导出</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-2">
        {Object.entries(workflows).length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            暂无工作流，点击"新建"创建一个工作流
          </div>
        ) : (
          Object.entries(workflows).map(([id, workflow]) => (
            <div
              key={id}
              className="group relative hover:bg-accent/5 rounded-lg transition-all duration-200"
            >
              <div className="flex items-center p-2 gap-3">
                {/* 左侧图标 */}
                <div className="shrink-0">
                  <div className="w-9 h-9 flex items-center justify-center rounded-lg bg-muted p-2">
                    <TbShape3 className="w-6 h-6" />
                  </div>
                </div>

                {/* 中间信息区 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-medium text-foreground truncate">
                      {workflow.name}
                    </h3>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {workflow.description || "暂无描述"}
                    </span>
                  </div>
                </div>

                {/* 右侧操作区 */}
                <div className="shrink-0 flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => WorkflowEditor.open(id)}
                  >
                    <TbEdit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => WorkflowManager.delete(id)}
                  >
                    <TbTrash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
