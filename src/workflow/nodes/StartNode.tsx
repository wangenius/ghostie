import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Record<string, string>
  >({});

  // 确保 inputs 存在
  const inputs = props.data.inputs || {};

  const addInput = () => {
    const newInputs = {
      ...inputs,
      [`input${Object.keys(inputs).length + 1}`]: "",
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

  const updateInput = (key: string, value: string) => {
    const newInputs = { ...inputs };
    newInputs[key] = value;
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

  const handleCompositionStart = (key: string, value: string) => {
    setComposingValues((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleCompositionEnd = (key: string, value: string) => {
    setComposingValues((prev) => {
      const newValues = { ...prev };
      delete newValues[key];
      return newValues;
    });
    updateInput(key, value);
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
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-2">
            {Object.entries(inputs).map(([key, value]) => (
              <div key={key} className="flex items-center gap-2">
                <Input
                  placeholder="参数名称"
                  value={composingValues[key] ?? value}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setComposingValues((prev) => ({
                      ...prev,
                      [key]: newValue,
                    }));
                  }}
                  onCompositionStart={(e) =>
                    handleCompositionStart(key, e.currentTarget.value)
                  }
                  onCompositionEnd={(e) =>
                    handleCompositionEnd(key, e.currentTarget.value)
                  }
                  className="flex-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => removeInput(key)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <Button variant="outline" size="sm" onClick={addInput}>
            <TbPlus className="h-4 w-4 mr-1" />
            添加输入参数
          </Button>
        </div>
      </motion.div>
    </NodePortal>
  );
};
