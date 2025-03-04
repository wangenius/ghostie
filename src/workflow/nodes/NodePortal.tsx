import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import { TbCheck, TbDots, TbLoader2, TbNumber, TbX } from "react-icons/tb";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import { toast } from "sonner";
import CustomHandle from "../components/CustomHandle";
import { NodeType } from "../types/nodes";
import { Workflow } from "../Workflow";

type NodeVariant = NodeType;

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
  left: number;
  right: number;
  variant?: NodeVariant;
  title?: string;
}

const variants: Record<NodeVariant, string> = {
  start: "bg-slate-50 border-slate-200",
  end: "bg-red-50 border-red-200",
  panel: "bg-muted border-muted-foreground/20",
  chat: "bg-blue-50 border-blue-200",
  bot: "bg-violet-50 border-violet-200",
  plugin: "bg-amber-50 border-amber-200",
  branch: "bg-orange-50 border-orange-200",
  iterator: "bg-green-50 border-green-200",
  code: "bg-purple-50 border-purple-200",
};

const NodePortalComponent = ({
  children,
  selected,
  isConnectable,
  left,
  right,
  id,
  data,
  variant = "start",
  title,
}: BaseNodeProps) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const workflow = Workflow.instance;
  const workflowState = workflow.use();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data, left, right, updateNodeInternals]);

  const state = workflowState.nodeStates[id];

  const handleCopyParameter = useCallback((nodeId: string) => {
    navigator.clipboard.writeText(nodeId);
    toast.success("节点ID已复制到剪贴板");
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleDeleteNode = useCallback(() => {
    workflow.deleteNode(id);
  }, [workflow, id]);

  // 使用 useMemo 缓存节点样式
  const nodeClassName = useMemo(
    () =>
      cn(
        "transition-all duration-200 border p-2 rounded-xl w-[250px] h-auto relative",
        variants[variant],
        selected && `ring-2 ring-primary/40`,
        !isConnectable && "opacity-60 cursor-not-allowed",
      ),
    [variant, selected, isConnectable],
  );

  // 使用 useMemo 缓存连接点样式
  const handleClassName = useMemo(
    () =>
      cn(
        state?.status === "completed" && "bg-green-500",
        state?.status === "failed" && "bg-red-500",
        state?.status === "running" && "bg-blue-500",
      ),
    [state],
  );

  if (!state) {
    return null;
  }
  return (
    <div
      onClick={handleNodeClick}
      onDoubleClick={handleNodeDoubleClick}
      className={nodeClassName}
    >
      <div className="flex items-center justify-between h-8 px-1">
        <div className="text-sm font-bold flex-1">{title || variant}</div>
        <div className="flex items-center gap-2">
          {state.status === "running" && (
            <div className="flex items-center gap-1">
              <TbLoader2 className="animate-spin rounded-full text-blue-500" />
            </div>
          )}
          {state.status === "completed" && (
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
                  <TbCheck className="rounded-full text-green-500" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <div className="text-sm font-medium">执行结果</div>
                  <div className="text-sm bg-green-50 border border-green-200 rounded p-2 max-h-[300px] overflow-y-auto">
                    {JSON.stringify(state.outputs.result)}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {state.status === "failed" && (
            <Popover>
              <PopoverTrigger asChild>
                <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
                  <TbX className="rounded-full text-red-500" />
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <div className="text-sm font-medium">错误信息</div>
                  <div className="text-sm bg-red-50 border border-red-200 rounded p-2 text-red-600">
                    {state.error}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {id !== "start" && id !== "end" && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <TbDots className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleCopyParameter(id)}>
                  <TbNumber className="h-4 w-4" />
                  {id}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDeleteNode}>
                  <TbX className="h-4 w-4" />
                  删除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* 内容区域 */}
      <div className={cn("relative z-10 nopan nodrag cursor-default p-0")}>
        {children}
      </div>
      {/* 左侧连接点 */}
      {Array.from({ length: left || 0 }).map((_, index) => (
        <CustomHandle
          key={`left-${index}`}
          type="target"
          id={`${index}`}
          position={Position.Left}
          isConnectable={isConnectable}
          style={{
            top: "50%",
          }}
          className={handleClassName}
        />
      ))}

      {/* 右侧连接点 */}
      {Array.from({ length: right || 0 }).map((_, index) => (
        <CustomHandle
          key={`right-${index}`}
          type="source"
          id={`${index}`}
          position={Position.Right}
          isConnectable={isConnectable}
          style={{
            top: "50%",
          }}
          className={handleClassName}
        />
      ))}
    </div>
  );
};

export const NodePortal = memo(NodePortalComponent);
