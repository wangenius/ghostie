import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToolProperty } from "@/toolkit/types";
import { Workflow } from "@/workflow/Workflow";
import { useCallback, useState } from "react";
import "reactflow/dist/style.css";
import { useFlow } from "../context/FlowContext";
import { StartNodeConfig } from "../types/nodes";
import JsonViewer from "@/components/custom/JsonViewer";
import { cn } from "@/lib/utils";
export const ExecuteDrawer = ({
  isExecuteDrawerOpen,
  setIsExecuteDrawerOpen,
  workflow,
}: {
  isExecuteDrawerOpen: boolean;
  setIsExecuteDrawerOpen: (open: boolean) => void;
  workflow: Workflow;
}) => {
  const [paramValues, setParamValues] = useState<Record<string, any>>({});
  const { nodes } = useFlow();
  const [result, setResult] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 处理参数值变更
  const handleParamValueChange = useCallback((path: string[], value: any) => {
    setParamValues((prev) => {
      const newValues = { ...prev };
      let current = newValues;
      for (let i = 0; i < path.length - 1; i++) {
        if (!current[path[i]]) {
          current[path[i]] = {};
        }
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return newValues;
    });
  }, []);

  // 处理参数确认
  const handleParamConfirm = useCallback(async () => {
    setIsLoading(true);
    const result = await workflow.execute(paramValues);
    setResult(result);
    setIsLoading(false);
  }, [workflow, paramValues]);

  // 渲染单个参数输入项
  const renderParamInput = useCallback(
    (
      name: string,
      property: ToolProperty,
      path: string[] = [],
      required: boolean = false,
    ) => {
      const currentPath = [...path, name];
      const currentValue = currentPath.reduce(
        (obj, key) => obj?.[key],
        paramValues,
      );

      if (property.type === "object" && property.properties) {
        return (
          <div key={name} className="space-y-2 border rounded-lg p-4">
            <Label className="font-bold">
              {name}
              {required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <div className="space-y-4 pl-4">
              {Object.entries(property.properties).map(([subName, subProp]) =>
                renderParamInput(
                  subName,
                  subProp as ToolProperty,
                  currentPath,
                  false,
                ),
              )}
            </div>
          </div>
        );
      }

      if (property.type === "array" && property.items) {
        return null;
      }

      return (
        <div key={name} className="space-y-2">
          <Label>
            {name}
            {required && <span className="text-red-500 ml-1">*</span>}
          </Label>
          <Input
            type={property.type === "number" ? "number" : "text"}
            placeholder={property.description}
            value={currentValue?.toString() || ""}
            onChange={(e) =>
              handleParamValueChange(
                currentPath,
                property.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
          />
        </div>
      );
    },
    [paramValues, handleParamValueChange],
  );

  // 渲染所有参数输入
  const renderParamInputs = useCallback(() => {
    const startNode = nodes.find((node) => node.type === "start");
    if (!startNode) return null;
    const parameters = (startNode.data as StartNodeConfig).parameters;
    if (!parameters?.properties) return null;

    return (
      <div className="space-y-4">
        {Object.entries(parameters.properties).map(([name, prop]) => {
          return renderParamInput(
            name,
            prop as ToolProperty,
            [],
            parameters.required?.includes(name) || false,
          );
        })}
      </div>
    );
  }, [nodes, renderParamInput]);

  return (
    <Drawer
      direction="right"
      open={isExecuteDrawerOpen}
      onOpenChange={setIsExecuteDrawerOpen}
      className="w-[380px]"
      key={`execute-${workflow.meta.id}`}
      title="Execute Workflow"
    >
      <div className="space-y-4">
        {renderParamInputs()}
        <div className="flex justify-end gap-2">
          <Button
            className={cn("w-full h-10", {
              "opacity-50": isLoading,
            })}
            variant="primary"
            disabled={isLoading}
            onClick={handleParamConfirm}
          >
            {isLoading ? "Executing..." : "Confirm"}
          </Button>
        </div>
      </div>
      {result && (
        <div className="flex gap-2">
          {typeof result === "object" && <JsonViewer data={result} />}
          {typeof result === "string" &&
            result
              .split("\n")
              .map((line: string) => <div key={line}>{line}</div>)}
        </div>
      )}
    </Drawer>
  );
};
