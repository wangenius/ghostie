import { motion } from "framer-motion";
import { NodeProps } from "reactflow";
import { EndNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { EditorWorkflow } from "../WorkflowEditor";

export const EndNode = (props: NodeProps<EndNodeConfig>) => {
  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);

  return (
    <NodePortal {...props} left={1} right={0} variant="default" title="结束">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {/* 执行结果 */}
        {st.status === "completed" && (
          <div className="font-medium text-green-700">
            执行完成
            <pre className="mt-2 p-2 bg-gray-50 rounded text-xs overflow-auto">
              {JSON.stringify(st.outputs, null, 2)}
            </pre>
          </div>
        )}
        {st.status === "failed" && (
          <div className="font-medium text-red-700">
            执行失败
            <div className="mt-2 p-2 bg-red-50 rounded text-xs">{st.error}</div>
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};
