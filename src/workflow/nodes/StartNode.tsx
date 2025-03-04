import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { Minus } from "lucide-react";
import { memo, useState, useCallback, useMemo } from "react";
import { TbPlus } from "react-icons/tb";
import { NodeProps } from "reactflow";
import { StartNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
import { useEditorWorkflow } from "../context/EditorContext";

const StartNodeComponent = (props: NodeProps<StartNodeConfig>) => {
  const workflow = useEditorWorkflow();

  const [composingValues, setComposingValues] = useState<
    Record<string, { key: string; value: string }>
  >({});

  // 确保 inputs 存在
  const inputs = props.data.inputs || {};

  const addInput = useCallback(() => {
    const newKey = `input${Object.keys(inputs).length + 1}`;
    const newInputs = {
      ...inputs,
      [newKey]: "",
    };
    workflow.set((s) => ({
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
  }, [workflow, props.id, inputs]);

  const removeInput = useCallback(
    (key: string) => {
      const newInputs = { ...inputs };
      delete newInputs[key];
      workflow.set((s) => ({
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
    },
    [workflow, props.id, inputs],
  );

  const updateInput = useCallback(
    (oldKey: string, newKey: string, value: string) => {
      const newInputs = { ...inputs };
      if (oldKey !== newKey) {
        delete newInputs[oldKey];
      }
      newInputs[newKey] = value;
      workflow.set((s) => ({
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
    },
    [workflow, props.id, inputs],
  );

  const handleCompositionStart = useCallback(
    (key: string, type: "key" | "value", content: string) => {
      setComposingValues((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [type]: content,
        },
      }));
    },
    [],
  );

  const handleCompositionEnd = useCallback(
    (oldKey: string, type: "key" | "value", content: string) => {
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
    },
    [updateInput, inputs],
  );

  const handleKeyChange = useCallback(
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newKey = e.target.value;
      setComposingValues((prev) => ({
        ...prev,
        [key]: { ...prev[key], key: newKey },
      }));
    },
    [],
  );

  const handleValueChange = useCallback(
    (key: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setComposingValues((prev) => ({
        ...prev,
        [key]: { ...prev[key], value: newValue },
      }));
    },
    [],
  );

  const handleKeyBlur = useCallback(
    (key: string) => (e: React.FocusEvent<HTMLInputElement>) => {
      const newKey = e.target.value;
      if (newKey && newKey !== key) {
        updateInput(key, newKey, inputs[key]);
      }
    },
    [updateInput, inputs],
  );

  const handleValueBlur = useCallback(
    (key: string) => (e: React.FocusEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      updateInput(key, key, newValue);
    },
    [updateInput],
  );

  const renderInputs = useMemo(
    () =>
      Object.entries(inputs).map(([key, value]) => (
        <div key={key} className="flex items-center gap-2">
          <Input
            placeholder="参数名称"
            value={(composingValues[key]?.key ?? key) || ""}
            onChange={handleKeyChange(key)}
            onCompositionStart={(e) =>
              handleCompositionStart(key, "key", e.currentTarget.value)
            }
            onCompositionEnd={(e) =>
              handleCompositionEnd(key, "key", e.currentTarget.value)
            }
            onBlur={handleKeyBlur(key)}
            className="flex-1 h-8 text-xs transition-colors"
          />
          <Input
            placeholder="参数值"
            value={(composingValues[key]?.value ?? value) || ""}
            onChange={handleValueChange(key)}
            onCompositionStart={(e) =>
              handleCompositionStart(key, "value", e.currentTarget.value)
            }
            onCompositionEnd={(e) =>
              handleCompositionEnd(key, "value", e.currentTarget.value)
            }
            onBlur={handleValueBlur(key)}
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
      )),
    [
      inputs,
      composingValues,
      handleKeyChange,
      handleValueChange,
      handleKeyBlur,
      handleValueBlur,
      handleCompositionStart,
      handleCompositionEnd,
      removeInput,
    ],
  );

  return (
    <NodePortal {...props} left={0} right={1} variant="default" title="开始">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-gray-600">输入参数</Label>
          <div className="flex flex-col gap-2">{renderInputs}</div>

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

export const StartNode = memo(StartNodeComponent);
