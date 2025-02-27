import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import { NodeProps } from "reactflow";
import { EditorWorkflow } from "../WorkflowEditor";
import { FilterNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

// 定义过滤条件类型
type Operator =
  | "equals"
  | "notEquals"
  | "contains"
  | "notContains"
  | "startsWith"
  | "endsWith"
  | "greaterThan"
  | "lessThan"
  | "greaterThanOrEqual"
  | "lessThanOrEqual"
  | "matches" // 正则表达式
  | "in"
  | "notIn"
  | "exists"
  | "notExists";

type DataType = "string" | "number" | "boolean" | "date" | "array" | "object";

interface FilterCondition {
  id: string;
  field: string;
  operator: Operator;
  value: string;
  dataType: DataType;
  isEnabled: boolean;
}

interface FilterGroup {
  id: string;
  type: "AND" | "OR";
  conditions: (FilterCondition | FilterGroup)[];
  isEnabled: boolean;
}

const operatorOptions = [
  { value: "equals", label: "等于" },
  { value: "notEquals", label: "不等于" },
  { value: "contains", label: "包含" },
  { value: "notContains", label: "不包含" },
  { value: "startsWith", label: "开头是" },
  { value: "endsWith", label: "结尾是" },
  { value: "greaterThan", label: "大于" },
  { value: "lessThan", label: "小于" },
  { value: "greaterThanOrEqual", label: "大于等于" },
  { value: "lessThanOrEqual", label: "小于等于" },
  { value: "matches", label: "匹配正则" },
  { value: "in", label: "在列表中" },
  { value: "notIn", label: "不在列表中" },
  { value: "exists", label: "存在" },
  { value: "notExists", label: "不存在" },
];

const dataTypeOptions = [
  { value: "string", label: "字符串" },
  { value: "number", label: "数字" },
  { value: "boolean", label: "布尔值" },
  { value: "date", label: "日期" },
  { value: "array", label: "数组" },
  { value: "object", label: "对象" },
];

const ConditionItem = ({
  condition,
  onUpdate,
  onDelete,
}: {
  condition: FilterCondition;
  onUpdate: (updated: FilterCondition) => void;
  onDelete: () => void;
}) => {
  return (
    <div className="flex items-center gap-2 p-2 border rounded-md">
      <Input
        className="w-32 text-xs"
        placeholder="字段名"
        value={condition.field}
        onChange={(e) => onUpdate({ ...condition, field: e.target.value })}
      />
      <Select
        value={condition.operator}
        onValueChange={(value) =>
          onUpdate({ ...condition, operator: value as Operator })
        }
      >
        <SelectTrigger variant="dust" className="w-24 text-xs">
          <SelectValue placeholder="选择操作符" />
        </SelectTrigger>
        <SelectContent>
          {operatorOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={condition.dataType}
        onValueChange={(value) =>
          onUpdate({ ...condition, dataType: value as DataType })
        }
      >
        <SelectTrigger variant="dust" className="w-20 text-xs">
          <SelectValue placeholder="选择类型" />
        </SelectTrigger>
        <SelectContent>
          {dataTypeOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        className="w-32 text-xs"
        placeholder="值"
        value={condition.value}
        onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
      />
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6"
        onClick={onDelete}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

const GroupItem = ({
  group,
  onUpdate,
  onDelete,
  level = 0,
}: {
  group: FilterGroup;
  onUpdate: (updated: FilterGroup) => void;
  onDelete: () => void;
  level?: number;
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const addCondition = () => {
    const newCondition: FilterCondition = {
      id: Math.random().toString(36).substr(2, 9),
      field: "",
      operator: "equals",
      value: "",
      dataType: "string",
      isEnabled: true,
    };
    onUpdate({
      ...group,
      conditions: [...group.conditions, newCondition],
    });
  };

  const addGroup = () => {
    const newGroup: FilterGroup = {
      id: Math.random().toString(36).substr(2, 9),
      type: "AND",
      conditions: [],
      isEnabled: true,
    };
    onUpdate({
      ...group,
      conditions: [...group.conditions, newGroup],
    });
  };

  const updateCondition = (
    index: number,
    updated: FilterCondition | FilterGroup,
  ) => {
    const newConditions = [...group.conditions];
    newConditions[index] = updated;
    onUpdate({ ...group, conditions: newConditions });
  };

  const deleteCondition = (index: number) => {
    onUpdate({
      ...group,
      conditions: group.conditions.filter((_, i) => i !== index),
    });
  };

  return (
    <div className={`border-l-2 pl-4 ${level > 0 ? "mt-2" : ""}`}>
      <div className="flex items-center gap-2 mb-2">
        <button
          className="p-1 hover:bg-muted rounded"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        <Select
          value={group.type}
          onValueChange={(value) =>
            onUpdate({ ...group, type: value as "AND" | "OR" })
          }
        >
          <SelectTrigger variant="dust" className="w-20 text-xs">
            <SelectValue placeholder="选择逻辑" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">且</SelectItem>
            <SelectItem value="OR">或</SelectItem>
          </SelectContent>
        </Select>
        {level > 0 && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onDelete}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {isExpanded && (
        <div className="space-y-2">
          {group.conditions.map((condition, index) => (
            <div key={condition.id}>
              {"operator" in condition ? (
                <ConditionItem
                  condition={condition}
                  onUpdate={(updated) => updateCondition(index, updated)}
                  onDelete={() => deleteCondition(index)}
                />
              ) : (
                <GroupItem
                  group={condition}
                  onUpdate={(updated) => updateCondition(index, updated)}
                  onDelete={() => deleteCondition(index)}
                  level={level + 1}
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={addCondition}
            >
              添加条件
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={addGroup}
            >
              添加条件组
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export const FilterNode = (props: NodeProps<FilterNodeConfig>) => {
  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);
  const data = props.data as FilterNodeConfig;
  const [rootGroup, setRootGroup] = useState<FilterGroup>(() => {
    // 从现有配置转换或创建新的根组
    return (
      data.filter?.group || {
        id: "root",
        type: "AND",
        conditions: [],
        isEnabled: true,
      }
    );
  });

  const updateNodeData = (group: FilterGroup) => {
    setRootGroup(group);
    EditorWorkflow.set((state) => ({
      ...state,
      data: {
        ...state.data,
        nodes: {
          ...state.data.nodes,
          [props.id]: {
            ...state.data.nodes[props.id],
            data: {
              ...state.data.nodes[props.id].data,
              filter: {
                group,
              },
            },
          },
        },
      },
    }));
  };

  return (
    <NodePortal
      {...props}
      left={1}
      right={1}
      variant="default"
      title="高级数据过滤"
      state={st.status}
      outputs={st.outputs}
    >
      <motion.div
        className="flex flex-col gap-3 p-3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <GroupItem
          group={rootGroup}
          onUpdate={updateNodeData}
          onDelete={() => {}}
        />
      </motion.div>
    </NodePortal>
  );
};
