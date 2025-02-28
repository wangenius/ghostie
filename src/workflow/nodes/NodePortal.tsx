import { context } from "@/components/custom/ContextMenu";
import { Menu } from "@/components/ui/menu";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { TbCheck, TbLoader2, TbX, TbCopy } from "react-icons/tb";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import CustomHandle from "../components/CustomHandle";
import { EditorWorkflow } from "../WorkflowEditor";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";

type NodeVariant =
  | "default"
  | "chat"
  | "bot"
  | "plugin"
  | "condition"
  | "branch";

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
  left: number;
  right: number;
  variant?: NodeVariant;
  state?: "idle" | "pending" | "running" | "completed" | "failed" | "skipped";
  title?: string;
  outputs?: Record<string, any>;
}

const variants: Record<NodeVariant, string> = {
  default: "bg-muted border-muted-foreground/20",
  chat: "bg-blue-50 border-blue-200",
  bot: "bg-violet-50 border-violet-200",
  plugin: "bg-amber-50 border-amber-200",
  condition: "bg-red-50 border-red-200",
  branch: "bg-orange-50 border-orange-200",
};

/* 基础节点组件*/
export const NodePortal = ({
  children,
  selected,
  isConnectable,
  left,
  right,
  id,
  data,
  variant = "default",
  state = "idle",
  title,
  outputs,
}: BaseNodeProps) => {
  const updateNodeInternals = useUpdateNodeInternals();
  const workflow = EditorWorkflow.use();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data, left, right, updateNodeInternals]);

  // 获取所有入边节点的输出
  const incomingNodes = Object.values(workflow.data.edges)
    .filter((edge) => edge.target === id)
    .map((edge) => ({
      nodeId: edge.source,
      node: workflow.data.nodes[edge.source],
      outputs: workflow.nodeStates[edge.source]?.outputs || {},
    }))
    .filter((node) => Object.keys(node.outputs).length > 0);

  const handleCopyParameter = (nodeId: string, key: string) => {
    const paramText = `{{inputs.${nodeId}.${key}}}`;
    navigator.clipboard.writeText(paramText);
    toast.success("参数已复制到剪贴板");
  };

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
      }}
      onContextMenu={(e) => {
        e.stopPropagation();
        e.preventDefault();
        context({
          event: e,
          content: (close) => (
            <Menu
              items={[
                {
                  label: "删除",
                  onClick: () => {
                    EditorWorkflow.deleteNode(id);
                    close();
                  },
                },
              ]}
            />
          ),
        });
      }}
      className={cn(
        // 基础样式
        "transition-all duration-200 border p-2 rounded-xl w-[260px] h-auto relative z-10",
        // 变体样式
        variants[variant],
        // 选中样式
        selected && `ring-2 ring-primary/40`,
        // 禁用样式
        !isConnectable && "opacity-60 cursor-not-allowed",
      )}
    >
      <div className="flex items-center justify-between h-8 px-1">
        <div className="text-sm font-bold flex-1">{title || variant}</div>
        <div className="flex items-center gap-2">
          {incomingNodes.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {incomingNodes.map((node, index) => (
                  <React.Fragment key={node.nodeId}>
                    {index > 0 && <DropdownMenuSeparator />}
                    <DropdownMenuItem disabled className="opacity-50">
                      来自 {node.node.data.name || node.node.type}
                    </DropdownMenuItem>
                    {Object.entries(node.outputs).map(([key, value]) => (
                      <DropdownMenuItem
                        key={`${node.nodeId}-${key}`}
                        onClick={() => handleCopyParameter(node.nodeId, key)}
                      >
                        <div className="flex items-center gap-2">
                          <TbCopy className="h-4 w-4" />
                          <span>{key}</span>
                          <span className="text-xs text-gray-500">
                            ({typeof value})
                          </span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </React.Fragment>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          {state === "running" && (
            <div className="flex items-center gap-1">
              <TbLoader2 className="animate-spin rounded-full text-blue-500" />
            </div>
          )}
        </div>
        {state === "completed" && (
          <Popover>
            <PopoverTrigger asChild>
              <div className="flex items-center gap-1 cursor-pointer hover:opacity-80">
                <TbCheck className="rounded-full text-green-500" />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-2">
                <div className="text-sm font-medium">执行结果</div>
                <div className="text-sm bg-green-50 border border-green-200 rounded p-2">
                  {outputs?.result}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
        {state === "failed" && (
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
                  {outputs?.error}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* 内容区域 */}
      <div
        className={cn("relative z-10 nowheel nopan nodrag cursor-default p-0")}
      >
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
          className={cn(
            state === "completed" && "bg-green-500",
            state === "failed" && "bg-red-500",
            state === "running" && "bg-blue-500",
          )}
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
          className={cn(
            state === "completed" && "bg-green-500",
            state === "failed" && "bg-red-500",
            state === "running" && "bg-blue-500",
          )}
        />
      ))}
    </div>
  );
};
