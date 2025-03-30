import { Textarea } from "@/components/ui/textarea";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { SwitchNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { NodeExecutor } from "../execute/NodeExecutor";

const SwitchNodeComponent = (props: NodeProps<SwitchNodeConfig>) => {
  const [condition, setCondition] = useState(props.data.condition || "");
  const { updateNodeData } = useFlow();
  const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCondition(e.target.value);
    updateNodeData(props.id, {
      ...props.data,
      condition: e.target.value,
    });
  };
  return (
    <NodePortal {...props} left={1} right={1} variant="switch" title="Switch">
      <Textarea
        variant="dust"
        className="text-xs h-16 resize-none p-2"
        placeholder="Enter condition"
        value={condition}
        onChange={handleConditionChange}
      />
    </NodePortal>
  );
};

export const SwitchNode = memo(SwitchNodeComponent);

export class SwitchNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      const switchConfig = this.node.data as SwitchNodeConfig;
      if (!switchConfig.condition) {
        throw new Error("Condition content is empty");
      }

      const context = {
        inputs: inputs || {},
        console: {
          log: (...args: any[]) => console.log(...args),
          error: (...args: any[]) => console.error(...args),
        },
      };

      const parsedCondition = this.parseTextFromInputs(
        switchConfig.condition,
        inputs,
      );

      const functionBody = `
        "use strict";
        const {inputs, console} = arguments[0];
        return ${parsedCondition}
      `;

      const executeFn = new Function(functionBody);
      const result: boolean = await executeFn(context);

      if (result) {
        this.updateNodeState({
          status: "completed",
          outputs: {
            result: true,
          },
        });
      } else {
        this.updateNodeState({
          status: "skipped",
          outputs: {
            result: false,
          },
        });
      }

      return {
        success: true,
        data: {
          result: result,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("switch", SwitchNodeExecutor);
