import { NodeProps } from "reactflow";
import { BranchNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useEditorWorkflow } from "../context/EditorContext";

export const BranchNode = (props: NodeProps<BranchNodeConfig>) => {
  const workflow = useEditorWorkflow();
  const workflowState = workflow.use();

  return (
    <NodePortal
      {...props}
      left={1}
      right={props.data.conditions?.length || 1}
      variant="branch"
      title="分支"
      state={workflowState.nodeStates[props.id].status}
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 执行结果 */}
        {(workflowState.nodeStates[props.id].status === "completed" ||
          workflowState.nodeStates[props.id].status === "failed") && (
          <div
            className={cn(
              "text-xs p-2 rounded border",
              workflowState.nodeStates[props.id].status === "completed"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200",
            )}
          >
            {workflowState.nodeStates[props.id].status === "completed" ? (
              <div className="font-medium text-green-700">
                选择分支:{" "}
                {workflowState.nodeStates[props.id].outputs.data?.label ||
                  "默认分支"}
              </div>
            ) : (
              <div className="font-medium text-red-700">
                {workflowState.nodeStates[props.id].error}
              </div>
            )}
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};
