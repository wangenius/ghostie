import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Textarea } from "@/components/ui/textarea";
import { TableStore } from "@/database/Database";
import { Echo } from "echo-state";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { useFlow } from "../context/FlowContext";
import { DatabaseNodeConfig, NodeState, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const DatabaseNodeComponent = (props: NodeProps<DatabaseNodeConfig>) => {
  const tables = TableStore.use();
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
export class DatabaseNodeExecutor extends NodeExecutor {
  constructor(
    node: WorkflowNode,
    updateNodeState: (update: Partial<NodeState>) => void,
  ) {
    super(node, updateNodeState);
  }

  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });
      const databaseConfig = this.node.data as DatabaseNodeConfig;

      const result = await Echo.get<Record<string, any>>({
        database: "TABLE_DATA",
        name: databaseConfig.table,
      }).getCurrent();

      // 创建并执行过滤函数
      const filterFnBody = `
try {
  return dataArray.filter(${databaseConfig.condition});
} catch (e) {
  console.error("过滤函数执行出错:", e);
  return dataArray;
}
`;

      console.log(filterFnBody);
      let value: Record<string, any>[] = [];

      // 创建并执行过滤函数
      const filterFn = new Function("dataArray", filterFnBody);
      value = filterFn(Object.values(result));

      // 确保结果是数组
      if (!Array.isArray(value)) {
        value = Array.isArray(result) ? result : [result];
      }
      this.updateNodeState({
        status: "completed",
        outputs: {
          result: value,
        },
      });

      return {
        success: true,
        data: {
          result: value,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("database", DatabaseNodeExecutor);
