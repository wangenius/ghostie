import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { memo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../execute/NodeExecutor";
import { Workflow } from "../execute/Workflow";
import { IteratorNodeConfig } from "../types/nodes";
import { WorkflowManager } from "../WorkflowManager";
import { NodePortal } from "./NodePortal";
const IteratorNodeComponent = (props: NodeProps<IteratorNodeConfig>) => {
  const [content, setContent] = useState(props.data.target || "");
  const workflows = WorkflowManager.use();
  const id = Workflow.instance.use((selector) => selector.id);
  const { updateNodeData } = useFlow();
  const handleTargetChange = (value: string) => {
    setContent(value);
    updateNodeData(props.id, { target: value });
  };
  const handleActionChange = (value: string) => {
    updateNodeData(props.id, { action: value });
  };
  return (
    <NodePortal {...props} left={1} right={1} variant="iterator" title="迭代器">
      <Input
        variant="dust"
        className="text-xs transition-colors resize-none p-2"
        value={content}
        onChange={(e) => {
          handleTargetChange(e.target.value);
        }}
        placeholder="迭代对象"
      />
      <DrawerSelector
        panelTitle="选择迭代对象"
        value={[props.data.action]}
        items={Object.values(workflows)
          .map((workflow) => {
            if (workflow.id !== id) {
              return {
                label: workflow.name || "未命名",
                value: workflow.id,
                description: workflow.description,
              };
            }
          })
          .filter((item) => item !== undefined)}
        onSelect={(value) => handleActionChange(value[0])}
      />
    </NodePortal>
  );
};

export const IteratorNode = memo(IteratorNodeComponent);

export class IteratorNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    this.updateNodeState({
      status: "running",
      startTime: new Date().toISOString(),
      inputs: inputs || {},
    });
    const { target, action } = this.node.data as IteratorNodeConfig;
    const workflow = await WorkflowManager.get(action);

    let content = this.parseTextFromInputs(target, inputs);
    content = `{ "result": ${content} }`;
    let body: { result: any; collected: any[] } = {
      result: null,
      collected: [],
    };

    try {
      const parsed = JSON.parse(content);

      body.result = parsed.result;
    } catch (error) {
      return {
        success: false,
        data: {},
        error: "迭代对象格式错误",
      };
    }

    // 如果 result 不是数组或对象，返回错误
    if (typeof body.result !== "object" || body.result === null) {
      return {
        success: false,
        data: {},
        error: "迭代对象必须是数组或对象",
      };
    }

    // 将对象或数组转换为可迭代的数组
    const items = Array.isArray(body.result)
      ? body.result
      : Object.entries(body.result).map(([key, value]) => ({ key, value }));

    for (const item of items) {
      if (typeof item !== "object") {
        return {
          success: false,
          data: {},
          error: "迭代项必须是对象类型",
        };
      }
      const result = await (
        await new Workflow().init(workflow?.id)
      ).execute(item);

      if (result.success) {
        body.collected.push(result.data);
      }
    }

    this.updateNodeState({
      status: "completed",
      endTime: new Date().toISOString(),
      outputs: {
        result: body.collected,
      },
    });

    return {
      success: true,
      data: {
        result: body.collected,
      },
    };
  }
}

NodeExecutor.register("iterator", IteratorNodeExecutor);
