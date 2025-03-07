import JsonViewer from "@/components/custom/JsonViewer";
import { motion } from "framer-motion";
import { memo, useMemo } from "react";
import { TbCircleX } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { NodeExecutor } from "../execute/NodeExecutor";
import { Workflow } from "../execute/Workflow";
import { PanelNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const PanelNodeComponent = (props: NodeProps<PanelNodeConfig>) => {
  const workflow = Workflow.instance;
  const workflowState = workflow.executor.use((selector) => selector[props.id]);

  const renderOutputs = useMemo(() => {
    if (workflowState?.status === "completed") {
      return (
        <div className="space-y-2">
          {Object.entries(workflowState?.outputs || {}).map(([key, value]) => (
            <div key={key} className="space-y-1 nowheel overflow-auto">
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
  }, [workflowState]);

  const renderError = useMemo(() => {
    if (workflowState?.status === "failed") {
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-500">
            <TbCircleX className="h-4 w-4" />
            <span className="text-sm">执行失败</span>
          </div>
          <div className="pl-6 text-xs text-red-500">
            {workflowState?.error}
          </div>
        </div>
      );
    }
    return null;
  }, [workflowState?.status, workflowState?.error]);

  return (
    <NodePortal {...props} left={1} right={1} variant="panel" title="展示面板">
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

export const PanelNode = memo(PanelNodeComponent);

export class PanelNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });
      console.log("执行完成", inputs);

      this.updateNodeState({
        status: "completed",
        outputs: inputs,
      });

      return {
        success: true,
        data: {
          result: inputs,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("panel", PanelNodeExecutor);
