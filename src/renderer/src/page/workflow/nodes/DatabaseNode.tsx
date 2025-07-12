import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Textarea } from "@/components/ui/textarea";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { DatabaseNodeConfig, NodeState, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const DatabaseNodeComponent = (props: NodeProps<DatabaseNodeConfig>) => {
  const tables = {
    "1": {
      id: "1",
      name: "Table 1",
      description: "Table 1 description",
    },
  };
  const [condition, setCondition] = useState(props.data.condition);
  const { updateNodeData } = useFlow();

  const handleTableChange = useCallback(
    (value: string) => {
      updateNodeData<DatabaseNodeConfig>(props.id, { table: value });
    },
    [updateNodeData, props.id],
  );

  const handleConditionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setCondition(e.target.value);
      updateNodeData<DatabaseNodeConfig>(props.id, {
        condition: e.target.value,
      });
    },
    [updateNodeData, props.id],
  );

  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="database"
      title="Database"
    >
      <DrawerSelector
        panelTitle="Select Table"
        value={[props.data.table]}
        items={Object.values(tables).map((table) => {
          return {
            label: table.name,
            value: table.id,
            description: table.description,
          };
        })}
        onSelect={(value) => handleTableChange(value[0])}
      />

      <Textarea
        variant="dust"
        className="text-xs min-h-[80px] transition-colors resize-none p-2"
        value={condition}
        onChange={handleConditionChange}
        placeholder="Enter condition like: i => i.name === 'test'"
      />
    </NodePortal>
  );
};

export const DatabaseNode = memo(DatabaseNodeComponent);