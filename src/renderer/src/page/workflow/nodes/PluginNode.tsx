import { TOOL_NAME_SPLIT } from "@/assets/const";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeState, PluginNodeConfig, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";
const PluginNodeComponent = (props: NodeProps<PluginNodeConfig>) => {
  const plugins = {
    "1": {
      id: "1",
      name: "Plugin 1",
      tools: [
        {
          name: "Tool 1",
          description: "Tool 1 description",
          parameters: {
            properties: {
              name: {
                type: "string",
              },
            },
          },
        },
      ],
      description: "Plugin 1 description",
      parameters: {
        properties: {
          name: {
            type: "string",
          },
        },
      },
    },
  };
  const { updateNodeData } = useFlow();
  const [localInputs, setLocalInputs] = useState<Record<string, string>>({});

  // 同步外部数据到本地状态
  useEffect(() => {
    if (props.data.args) {
      setLocalInputs(
        Object.entries(props.data.args).reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: String(value),
          }),
          {},
        ),
      );
    }
  }, [props.data.plugin, props.data.tool]);

  const handlePluginChange = useCallback(
    (value: string) => {
      const [plugin, tool] = value.split(TOOL_NAME_SPLIT);

      updateNodeData<PluginNodeConfig>(props.id, {
        plugin,
        tool,
        args: {},
      });
    },
    [updateNodeData, props.id],
  );

  const handleParameterChange = useCallback(
    (key: string, value: string, type: string) => {
      // 立即更新本地状态
      setLocalInputs((prev) => ({
        ...prev,
        [key]: value,
      }));
      // 使用setTimeout来模拟防抖，300ms后更新父组件状态
      const timer = setTimeout(() => {
        updateNodeData<PluginNodeConfig>(props.id, (data) => ({
          args: {
            ...data.args,
            [key]: type === "number" ? Number(value) : value,
          },
        }));
      }, 300);

      return () => clearTimeout(timer);
    },
    [updateNodeData, props.id],
  );

  const parameterItems = useMemo(() => {
    if (!props.data.plugin || !props.data.tool) return null;

    const toolParameters =
      plugins[props.data.plugin]?.tools.find((t) => t.name === props.data.tool)
        ?.parameters?.properties || {};

    return Object.entries(toolParameters).map(([key, prop]) => (
      <div key={key} className="flex flex-col gap-1">
        <div className="text-xs text-gray-500">{key}</div>
        <Input
          type={(prop as any).type === "number" ? "number" : "text"}
          className="h-8 px-3 text-xs rounded-full border"
          variant="dust"
          value={localInputs[key] || ""}
          onChange={(e) =>
            handleParameterChange(key, e.target.value, (prop as any).type)
          }
          placeholder={`Enter ${key}...`}
        />
      </div>
    ));
  }, [
    plugins,
    props.data.plugin,
    props.data.tool,
    localInputs,
    handleParameterChange,
  ]);

  return (
    <NodePortal {...props} left={1} right={1} variant="plugin" title="Plugin">
      <DrawerSelector
        panelTitle="Select Plugin"
        value={[props.data.plugin + TOOL_NAME_SPLIT + props.data.tool]}
        items={Object.values(plugins)
          .map((plugin) => {
            return plugin.tools.map((tool) => ({
              label: tool.name,
              value: plugin.id + TOOL_NAME_SPLIT + tool.name,
              description: tool.description,
              type: plugin.name,
            }));
          })
          .flat()}
        onSelect={(value) => handlePluginChange(value[0])}
      />

      {plugins[props.data.plugin] && (
        <div className="flex flex-col gap-2">
          <div className="text-xs font-medium">Parameter Settings</div>
          {parameterItems}
        </div>
      )}
    </NodePortal>
  );
};

export const PluginNode = memo(PluginNodeComponent);
