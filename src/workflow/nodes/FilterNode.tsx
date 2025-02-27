import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Filter, Plus, X } from "lucide-react";
import { useState } from "react";
import { NodeProps } from "reactflow";
import { EditorWorkflow } from "../WorkflowEditor";
import { FilterNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

export const FilterNode = (props: NodeProps<FilterNodeConfig>) => {
  const st = EditorWorkflow.use((s) => s.nodeStates[props.id]);
  const data = props.data as FilterNodeConfig;
  const [fields, setFields] = useState<string[]>(data.filter.fields || []);
  const [newField, setNewField] = useState("");

  const addField = () => {
    if (newField && !fields.includes(newField)) {
      const updatedFields = [...fields, newField];
      setFields(updatedFields);
      setNewField("");
      updateNodeData(updatedFields);
    }
  };

  const removeField = (field: string) => {
    const updatedFields = fields.filter((f) => f !== field);
    setFields(updatedFields);
    updateNodeData(updatedFields);
  };

  const updateNodeData = (updatedFields: string[]) => {
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
                ...(state.data.nodes[props.id].data as FilterNodeConfig).filter,
                fields: updatedFields,
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
      title="数据过滤"
      state={st.status}
      outputs={st.outputs}
    >
      <motion.div
        className="flex flex-col gap-3 p-3"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-2">
          <Input
            variant="dust"
            className="h-8 text-xs"
            value={newField}
            onChange={(e) => setNewField(e.target.value)}
            placeholder="输入字段名..."
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={addField}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {fields.map((field) => (
            <div
              key={field}
              className="flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <Filter className="h-3 w-3" />
              <span>{field}</span>
              <button
                className="ml-1 rounded-full hover:bg-muted-foreground/20"
                onClick={() => removeField(field)}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      </motion.div>
    </NodePortal>
  );
};
