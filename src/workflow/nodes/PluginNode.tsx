import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { PluginManager } from "@/plugin/PluginManager";
import { motion } from "framer-motion";
import { memo, useCallback, useMemo, useState, useEffect } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { PluginNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const PluginNodeComponent = (props: NodeProps<PluginNodeConfig>) => {
  const plugins = PluginManager.use();
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
      const [plugin, tool] = value.split("::");
      console.log(plugin, tool);
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
      plugins[props.data.plugin].tools.find((t) => t.name === props.data.tool)
        ?.parameters?.properties || {};

    return Object.entries(toolParameters).map(([key, prop]) => (
      <div key={key} className="flex flex-col gap-1">
        <div className="text-xs text-gray-500">{key}</div>
        <Input
          type={prop.type === "number" ? "number" : "text"}
          className="h-8 px-2 text-xs rounded-md border"
          variant="dust"
          value={localInputs[key] || ""}
          onChange={(e) =>
            handleParameterChange(key, e.target.value, prop.type)
          }
          placeholder={`输入${key}...`}
        />
      </div>
    ));
  }, [
    plugins[props.data.plugin],
    props.data.tool,
    localInputs,
    handleParameterChange,
  ]);

  return (
    <NodePortal {...props} left={1} right={1} variant="plugin" title="插件">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <DrawerSelector
          panelTitle="选择插件"
          value={[props.data.plugin + "::" + props.data.tool]}
          items={Object.values(plugins)
            .map((plugin) => {
              return plugin.tools.map((tool) => ({
                label: tool.name,
                value: plugin.id + "::" + tool.name,
                description: tool.description,
                type: plugin.name,
              }));
            })
            .flat()}
          onSelect={(value) => handlePluginChange(value[0])}
        />

        {plugins[props.data.plugin] && (
          <div className="flex flex-col gap-2">
            <div className="text-xs font-medium">参数设置</div>
            {parameterItems}
          </div>
        )}
      </motion.div>
    </NodePortal>
  );
};

export const PluginNode = memo(PluginNodeComponent);
