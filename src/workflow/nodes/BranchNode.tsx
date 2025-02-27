import { NodeProps } from "reactflow";
import { BranchNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { EditorWorkflow } from "../WorkflowEditor";

export const BranchNode = (props: NodeProps<BranchNodeConfig>) => {
  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);

  return (
    <NodePortal
      {...props}
      left={1}
      right={props.data.conditions?.length || 1}
      variant="branch"
      title="分支"
      state={st.status}
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 执行结果 */}
        {(st.status === "completed" || st.status === "failed") && (
          <div
            className={cn(
              "text-xs p-2 rounded border",
              st.status === "completed"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200",
            )}
          >
            {st.status === "completed" ? (
              <div className="font-medium text-green-700">
                选择分支: {st.outputs.data?.label || "默认分支"}
              </div>
            ) : (
              <div className="font-medium text-red-700">{st.error}</div>
            )}
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};
