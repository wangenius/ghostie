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
import { motion } from "framer-motion";
import React, { memo, useCallback, useEffect, useMemo } from "react";
import {
  TbCheck,
  TbCircleDashed,
  TbDots,
  TbLoader2,
  TbNumber,
  TbProgressBolt,
  TbX,
} from "react-icons/tb";
import { NodeProps, Position, useUpdateNodeInternals } from "reactflow";
import { toast } from "sonner";
import CustomHandle from "../components/CustomHandle";
import { useFlow } from "../context/FlowContext";
import { Workflow } from "../execute/Workflow";
import { NODE_TYPES, NodeType } from "../types/nodes";

type NodeVariant = NodeType;

interface BaseNodeProps extends NodeProps {
  children: React.ReactNode;
  left: number;
  right: number;
  variant?: NodeVariant;
  title?: string;
}

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
  const workflowState = workflow.executor.use();
  const { onNodesChange } = useFlow();

  useEffect(() => {
    updateNodeInternals(id);
  }, [id, data, left, right, updateNodeInternals]);

  const state = workflowState[id];

  useEffect(() => {}, [workflowState]);

  const handleCopyParameter = useCallback((nodeId: string) => {
    navigator.clipboard.writeText(nodeId);
    toast.success("Node ID copied to clipboard");
  }, []);

  const handleNodeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  const handleNodeDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
  }, []);

  const handleDeleteNode = useCallback(() => {
    onNodesChange([{ type: "remove", id }]);
  }, [id, onNodesChange]);

  // 使用 useMemo 缓存节点样式
  const nodeClassName = useMemo(
    () =>
      cn(
        "transition-all duration-200 border p-2 rounded-xl w-[250px] h-auto relative",
        NODE_TYPES[variant].variant,
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

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const Icon = NODE_TYPES[variant].icon;

  return (
    <div
      onClick={handleNodeClick}
      onDoubleClick={handleNodeDoubleClick}
      className={nodeClassName}
      onContextMenu={handleContextMenu}
      key={workflow.id + id}
    >
      <div className="flex items-center justify-between h-8 px-1">
        <div className="text-sm font-bold flex-1 flex items-center gap-1">
          <Button
            variant="ghost"
            className="p-0 bg-muted-foreground/10"
            size="icon"
          >
            <Icon className="h-4 w-4" />
          </Button>
          {title || variant}
          {NODE_TYPES[variant].preview && (
            <div className="flex items-center gap-1 bg-yellow-400 rounded-full pl-0.5 py-0.5 pr-2">
              <div className="w-4 h-4 flex items-center justify-center">
                <TbProgressBolt className="h-4 w-4 text-yellow-900" />
              </div>
              <span className="text-xs text-yellow-900">Preview</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          {state?.status === "running" && (
            <Button variant="ghost" size="icon">
              <TbLoader2 className="animate-spin rounded-full text-blue-500" />
            </Button>
          )}
          {state?.status === "skipped" && (
            <Button variant="ghost" size="icon">
              <TbCircleDashed className="rounded-full text-muted-foreground" />
            </Button>
          )}
          {state?.status === "completed" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <TbCheck className="rounded-full text-green-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Execution Result</div>
                  <div className="text-sm bg-green-50 border border-green-200 rounded p-2 max-h-[300px] overflow-y-auto">
                    {typeof state.outputs.result === "object"
                      ? JSON.stringify(state.outputs.result)
                      : state.outputs.result || JSON.stringify(state.outputs)}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          {state?.status === "failed" && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <TbX className="rounded-full text-red-500" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Error Information</div>
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
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <motion.div
        className="relative z-10 nopan nodrag cursor-default flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>

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
