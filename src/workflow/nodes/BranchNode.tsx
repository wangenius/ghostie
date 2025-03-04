import { NodeProps } from "reactflow";
import { BranchNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Workflow } from "../Workflow";
import { memo, useMemo } from "react";

const BranchNodeComponent = (props: NodeProps<BranchNodeConfig>) => {
  const workflow = Workflow.instance;
  const workflowState = workflow.use();
  const nodeState = workflowState.nodeStates[props.id];

  const renderExecutionResult = useMemo(() => {
    if (nodeState.status !== "completed" && nodeState.status !== "failed") {
      return null;
    }

    const isCompleted = nodeState.status === "completed";
    return (
      <div
        className={cn(
          "text-xs p-2 rounded border",
          isCompleted
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200",
        )}
      >
        {isCompleted ? (
          <div className="font-medium text-green-700">
            选择分支: {nodeState.outputs.data?.label || "默认分支"}
          </div>
        ) : (
          <div className="font-medium text-red-700">{nodeState.error}</div>
        )}
      </div>
    );
  }, [nodeState.status, nodeState.outputs.data?.label, nodeState.error]);

  return (
    <NodePortal
      {...props}
      left={1}
      right={props.data.conditions?.length || 1}
      variant="branch"
      title="分支"
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderExecutionResult}
      </motion.div>
    </NodePortal>
  );
};

export const BranchNode = memo(BranchNodeComponent);
