import { motion } from "framer-motion";
import { TbCircleX } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { EndNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import JsonViewer from "@/components/custom/JsonViewer";
import { Workflow } from "../Workflow";
import { memo, useMemo } from "react";

const EndNodeComponent = (props: NodeProps<EndNodeConfig>) => {
  const workflow = Workflow.instance;
  const workflowState = workflow.use();
  const nodeState = workflowState.nodeStates[props.id];

  if (!nodeState) {
    return null;
  }

  const renderOutputs = useMemo(() => {
    if (nodeState.status === "completed") {
      return (
        <div className="space-y-2">
          {Object.entries(nodeState.outputs).map(([key, value]) => (
            <div key={key} className="space-y-1 overflow-auto">
              <div className="text-xs font-medium text-gray-400">{key}</div>
              {typeof value === "object" ? (
                <JsonViewer data={value} />
              ) : (
                <div className="text-sm text-gray-300">{value}</div>
              )}
            </div>
          ))}
        </div>
      );
    }
    return null;
  }, [nodeState.status, nodeState.outputs]);

  const renderError = useMemo(() => {
    if (nodeState.status === "failed") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-500">
            <TbCircleX className="h-4 w-4" />
            <span className="text-sm">执行失败</span>
          </div>
          <div className="pl-6 text-xs text-red-500">{nodeState.error}</div>
        </div>
      );
    }
    return null;
  }, [nodeState.status, nodeState.error]);

  return (
    <NodePortal {...props} left={1} right={0} variant="default" title="结束">
      <motion.div
        className="flex flex-col gap-2"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {renderOutputs}
        {renderError}
      </motion.div>
    </NodePortal>
  );
};

export const EndNode = memo(EndNodeComponent);
