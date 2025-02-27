import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Minus } from "lucide-react";
import { useState } from "react";
import { TbPlus } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { StartNodeConfig } from "../types/nodes";
import { EditorWorkflow } from "../WorkflowEditor";
import { NodePortal } from "./NodePortal";

export const StartNode = (props: NodeProps<StartNodeConfig>) => {
  const workflow = EditorWorkflow.use();

  const [composingValues, setComposingValues] = useState<
    Record<string, { key: string; value: string }>
  >({});

  // 确保 inputs 存在
  const inputs = props.data.inputs || {};

  const addInput = () => {
    const newKey = `input${Object.keys(inputs).length + 1}`;
    const newInputs = {
      ...inputs,
      [newKey]: "",
    };
    EditorWorkflow.set((s) => ({
      ...s,
      data: {
        ...s.data,
        nodes: {
          ...s.data.nodes,
          [props.id]: {
            ...s.data.nodes[props.id],
            data: {
              ...s.data.nodes[props.id].data,
              inputs: newInputs,
            },
          },
        },
      },
    }));
  };

  const removeInput = (key: string) => {
    const newInputs = { ...inputs };
    delete newInputs[key];
    EditorWorkflow.set((s) => ({
      ...s,
      data: {
        ...s.data,
        nodes: {
          ...s.data.nodes,
          [props.id]: {
            ...s.data.nodes[props.id],
            data: {
              ...s.data.nodes[props.id].data,
              inputs: newInputs,
            },
          },
        },
      },
    }));
  };

  const updateInput = (oldKey: string, newKey: string, value: string) => {
    const newInputs = { ...inputs };
    if (oldKey !== newKey) {
      delete newInputs[oldKey];
    }
    newInputs[newKey] = value;
    EditorWorkflow.set((s) => ({
      ...s,
      data: {
        ...s.data,
        nodes: {
          ...s.data.nodes,
          [props.id]: {
            ...s.data.nodes[props.id],
            data: {
              ...s.data.nodes[props.id].data,
              inputs: newInputs,
            },
          },
        },
      },
    }));
  };

  const handleCompositionStart = (
    key: string,
    type: "key" | "value",
    content: string,
  ) => {
    setComposingValues((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [type]: content,
      },
    }));
  };

  const handleCompositionEnd = (
    oldKey: string,
    type: "key" | "value",
    content: string,
  ) => {
    setComposingValues((prev) => {
      const newValues = { ...prev };
      delete newValues[oldKey];
      return newValues;
    });

    if (type === "key") {
      updateInput(oldKey, content, inputs[oldKey]);
    } else {
      updateInput(oldKey, oldKey, content);
    }
  };

  return (
    <NodePortal
      {...props}
      left={0}
      right={1}
      variant="default"
      title="开始"
      state={workflow.nodeStates[props.id].status}
    >
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">输入参数</Label>
          <div className="flex flex-col gap-2">
            {Object.entries(inputs).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Input
                  placeholder="参数名称"
                  value={(composingValues[key]?.key ?? key) || ""}
                  onChange={(e) => {
                    const newKey = e.target.value;
                    setComposingValues((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], key: newKey },
                    }));
                  }}
                  onCompositionStart={(e) =>
                    handleCompositionStart(key, "key", e.currentTarget.value)
                  }
                  onCompositionEnd={(e) =>
                    handleCompositionEnd(key, "key", e.currentTarget.value)
                  }
                  onBlur={(e) => {
                    const newKey = e.target.value;
                    if (newKey && newKey !== key) {
                      updateInput(key, newKey, inputs[key]);
                    }
                  }}
                  className="flex-1 h-8 text-xs transition-colors"
                />
                <Input
                  placeholder="参数值"
                  value={(composingValues[key]?.value ?? value) || ""}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setComposingValues((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], value: newValue },
                    }));
                  }}
                  onCompositionStart={(e) =>
                    handleCompositionStart(key, "value", e.currentTarget.value)
                  }
                  onCompositionEnd={(e) =>
                    handleCompositionEnd(key, "value", e.currentTarget.value)
                  }
                  onBlur={(e) => {
                    const newValue = e.target.value;
                    updateInput(key, key, newValue);
                  }}
                  className="flex-1 h-8 text-xs transition-colors"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => removeInput(key)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={addInput}
            className="w-full"
          >
            <TbPlus className="h-4 w-4 mr-1" />
            添加输入参数
          </Button>
        </div>
      </motion.div>
    </NodePortal>
  );
};
