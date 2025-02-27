import { motion } from "framer-motion";
import { TbCircleX } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { EndNodeConfig } from "../types/nodes";
import { EditorWorkflow } from "../WorkflowEditor";
import { NodePortal } from "./NodePortal";

export const EndNode = (props: NodeProps<EndNodeConfig>) => {
  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);

  return (
    <NodePortal {...props} left={1} right={0} variant="default" title="结束">
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {st.status === "completed" && (
          <div className="space-y-2">
            {Object.entries(st.outputs).map(([key, value]) => (
              <div key={key} className="space-y-1">
                <div className="text-xs text-gray-500">{key}</div>
                {typeof value === "object" ? (
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded">
                    {value.result || JSON.stringify(value, null, 2)}
                  </div>
                ) : (
                  <div className="text-sm">{value}</div>
                )}
              </div>
            ))}
          </div>
        )}
        {st.status === "failed" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-red-500">
              <TbCircleX className="h-4 w-4" />
              <span className="text-sm">执行失败</span>
            </div>
            <div className="pl-6 text-xs text-red-500">{st.error}</div>
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};
