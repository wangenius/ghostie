import {
  ToolParameters,
  ToolProperty,
  ToolPropertyType,
} from "@/plugin/types/plugin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { PlusCircle, Trash2 } from "lucide-react";
import { nanoid } from "nanoid";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../execute/NodeExecutor";
import { StartNodeConfig } from "../types/nodes";
import { NodePortal } from "./NodePortal";
// 定义一个更易于编辑的参数格式
interface EditableProperty {
  id: string;
  name: string;
  description: string;
  type: ToolPropertyType;
  required: boolean;
  properties?: Record<string, EditableProperty>;
  items?: EditableProperty;
}

// 将ToolParameters转换为可编辑格式
const toolParamsToEditable = (params?: ToolParameters): EditableProperty[] => {
  if (!params || !params.properties) return [];

  return Object.entries(params.properties).map(([key, prop]) => {
    const editableProp: EditableProperty = {
      id: key,
      name: key,
      description: prop.description || "",
      type: prop.type,
      required: params.required?.includes(key) || false,
    };

    if (prop.properties) {
      editableProp.properties = {};
      Object.entries(prop.properties).forEach(([propKey, propValue]) => {
        editableProp.properties![propKey] = {
          id: propKey,
          name: propKey,
          description: propValue.description || "",
          type: propValue.type,
          required: false,
        };

        if (propValue.properties) {
          const nestedProps: Record<string, EditableProperty> = {};
          Object.entries(propValue.properties).forEach(
            ([nestedKey, nestedValue]) => {
              nestedProps[nestedKey] = {
                id: nestedKey,
                name: nestedKey,
                description: nestedValue.description || "",
                type: nestedValue.type,
                required: false,
              };
            },
          );
          editableProp.properties![propKey].properties = nestedProps;
        }

        // 处理数组项
        if (propValue.items) {
          editableProp.properties![propKey].items = {
            id: "item",
            name: "item",
            description: propValue.items.description || "",
            type: propValue.items.type,
            required: false,
          };
        }
      });
    }

    // 处理数组项
    if (prop.items) {
      editableProp.items = {
        id: "item",
        name: "item",
        description: prop.items.description || "",
        type: prop.items.type,
        required: false,
      };

      // 处理数组项的属性
      if (prop.items.properties) {
        editableProp.items.properties = {};
        Object.entries(prop.items.properties).forEach(
          ([itemKey, itemValue]) => {
            editableProp.items!.properties![itemKey] = {
              id: itemKey,
              name: itemKey,
              description: itemValue.description || "",
              type: itemValue.type,
              required: false,
            };
          },
        );
      }
    }

    return editableProp;
  });
};

// 将可编辑格式转换回ToolParameters
const editableToToolParams = (
  editableProps: EditableProperty[],
): ToolParameters => {
  const properties: Record<string, ToolProperty> = {};
  const required: string[] = [];

  editableProps.forEach((prop) => {
    if (prop.required) {
      required.push(prop.name);
    }

    const toolProp: ToolProperty = {
      type: prop.type,
      description: prop.description,
    };

    // 处理对象属性
    if (prop.properties) {
      toolProp.properties = {};
      Object.entries(prop.properties).forEach(([key, value]) => {
        toolProp.properties![value.name || key] = {
          type: value.type,
          description: value.description,
        };

        // 处理嵌套属性
        if (value.properties) {
          toolProp.properties![key].properties = {};
          Object.entries(value.properties).forEach(
            ([nestedKey, nestedValue]) => {
              toolProp.properties![key].properties![nestedKey] = {
                type: nestedValue.type,
                description: nestedValue.description,
              };
            },
          );
        }

        // 处理数组项
        if (value.items) {
          toolProp.properties![key].items = {
            type: value.items.type,
            description: value.items.description,
          };
        }
      });
    }

    // 处理数组项
    if (prop.items) {
      toolProp.items = {
        type: prop.items.type,
        description: prop.items.description,
      };

      // 处理数组项的属性
      if (prop.items.properties) {
        toolProp.items.properties = {};
        Object.entries(prop.items.properties).forEach(([key, value]) => {
          toolProp.items!.properties![key] = {
            type: value.type,
            description: value.description,
          };
        });
      }
    }

    properties[prop.name] = toolProp;
  });

  return {
    type: "object",
    properties,
    required,
  };
};

const StartNodeComponent = (props: NodeProps<StartNodeConfig>) => {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { updateNodeData } = useFlow();

  // 将ToolParameters转换为可编辑格式
  const [editableParams, setEditableParams] = useState<EditableProperty[]>(
    toolParamsToEditable(props.data.parameters),
  );

  useEffect(() => {
    setEditableParams(toolParamsToEditable(props.data.parameters));
  }, [props.data.parameters]);

  // 处理抽屉关闭时保存参数
  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // 抽屉关闭时保存参数
        updateNodeData<StartNodeConfig>(props.id, {
          parameters: editableToToolParams(editableParams),
        });
      }
      setDrawerOpen(open);
    },
    [editableParams, updateNodeData],
  );

  // 添加新参数
  const addParam = useCallback(() => {
    const newParam: EditableProperty = {
      id: `param_${nanoid(6)}`,
      name: "",
      description: "",
      type: "string",
      required: false,
    };

    setEditableParams((prev) => [...prev, newParam]);
  }, []);

  // 删除参数
  const removeParam = useCallback((paramId: string) => {
    setEditableParams((prev) => prev.filter((p) => p.id !== paramId));
  }, []);

  // 更新参数
  const updateParam = useCallback(
    (paramId: string, updates: Partial<EditableProperty>) => {
      setEditableParams((prev) =>
        prev.map((p) => (p.id === paramId ? { ...p, ...updates } : p)),
      );
    },
    [],
  );

  // 添加对象属性
  const addObjectProperty = useCallback((paramPath: string) => {
    const propId = `prop_${nanoid(6)}`;

    setEditableParams((prev) => {
      const updateNestedProperty = (
        params: EditableProperty[],
        path: string[],
      ): EditableProperty[] => {
        if (path.length === 1) {
          return params.map((p) => {
            if (p.id === path[0] && p.type === "object") {
              return {
                ...p,
                properties: {
                  ...(p.properties || {}),
                  [propId]: {
                    id: propId,
                    name: "",
                    description: "",
                    type: "string" as ToolPropertyType,
                    required: false,
                  },
                },
              };
            }
            return p;
          });
        }

        return params.map((p) => {
          if (p.id === path[0] && p.type === "object" && p.properties) {
            const newProperties = { ...p.properties };
            const targetPropId = path[1];
            const restPath = path.slice(1);

            newProperties[targetPropId] = {
              ...newProperties[targetPropId],
              properties: {
                ...(newProperties[targetPropId].properties || {}),
                ...updateNestedProperty(
                  [newProperties[targetPropId]],
                  restPath,
                )[0].properties,
              },
            };

            return { ...p, properties: newProperties };
          }
          return p;
        });
      };

      const pathParts = paramPath.split("/");
      return updateNestedProperty(prev, pathParts);
    });
  }, []);

  // 删除对象属性
  const removeObjectProperty = useCallback(
    (paramPath: string, propId: string) => {
      setEditableParams((prev) => {
        const updateNestedProperty = (
          params: EditableProperty[],
          path: string[],
        ): EditableProperty[] => {
          if (path.length === 1) {
            return params.map((p) => {
              if (p.id === path[0] && p.type === "object" && p.properties) {
                const newProperties = { ...p.properties };
                delete newProperties[propId];
                return { ...p, properties: newProperties };
              }
              return p;
            });
          }

          return params.map((p) => {
            if (p.id === path[0] && p.type === "object" && p.properties) {
              const newProperties = { ...p.properties };
              const targetPropId = path[1];

              if (path.length === 2) {
                // 如果是直接子属性，直接删除
                if (newProperties[targetPropId]?.properties) {
                  const targetProperties = {
                    ...newProperties[targetPropId].properties,
                  };
                  delete targetProperties[propId];
                  newProperties[targetPropId] = {
                    ...newProperties[targetPropId],
                    properties: targetProperties,
                  };
                }
              } else {
                // 如果是更深层的嵌套，继续递归
                const restPath = path.slice(1);
                newProperties[targetPropId] = {
                  ...newProperties[targetPropId],
                  properties: {
                    ...(newProperties[targetPropId].properties || {}),
                    ...updateNestedProperty(
                      [newProperties[targetPropId]],
                      restPath,
                    )[0].properties,
                  },
                };
              }

              return { ...p, properties: newProperties };
            }
            return p;
          });
        };

        const pathParts = paramPath.split("/");
        return updateNestedProperty(prev, pathParts);
      });
    },
    [],
  );

  // 更新对象属性
  const updateObjectProperty = useCallback(
    (paramPath: string, propId: string, updates: Partial<EditableProperty>) => {
      setEditableParams((prev) => {
        const updateNestedProperty = (
          params: EditableProperty[],
          path: string[],
        ): EditableProperty[] => {
          if (path.length === 1) {
            return params.map((p) => {
              if (p.id === path[0] && p.type === "object" && p.properties) {
                return {
                  ...p,
                  properties: {
                    ...p.properties,
                    [propId]: {
                      ...p.properties[propId],
                      ...updates,
                    },
                  },
                };
              }
              return p;
            });
          }

          return params.map((p) => {
            if (p.id === path[0] && p.type === "object" && p.properties) {
              const newProperties = { ...p.properties };
              const targetPropId = path[1];
              const restPath = path.slice(1);

              newProperties[targetPropId] = {
                ...newProperties[targetPropId],
                properties: {
                  ...(newProperties[targetPropId].properties || {}),
                  ...updateNestedProperty(
                    [newProperties[targetPropId]],
                    restPath,
                  )[0].properties,
                },
              };

              return { ...p, properties: newProperties };
            }
            return p;
          });
        };

        const pathParts = paramPath.split("/");
        return updateNestedProperty(prev, pathParts);
      });
    },
    [],
  );

  // 更新数组项类型
  const updateArrayItemType = useCallback(
    (paramId: string, itemType: ToolPropertyType) => {
      setEditableParams((prev) =>
        prev.map((p) => {
          if (p.id === paramId && p.type === "array") {
            return {
              ...p,
              items: {
                ...(p.items || {
                  id: "item",
                  name: "item",
                  description: "",
                  required: false,
                }),
                type: itemType,
              },
            };
          }
          return p;
        }),
      );
    },
    [],
  );

  // 声明函数类型
  type RenderObjectPropertiesFunction = (
    param: EditableProperty,
    parentPath?: string,
  ) => React.ReactNode;
  type RenderArrayItemTypeFunction = (
    param: EditableProperty,
  ) => React.ReactNode;

  // 创建引用以打破循环依赖
  const renderObjectPropertiesRef = useRef<RenderObjectPropertiesFunction>();
  const renderArrayItemTypeRef = useRef<RenderArrayItemTypeFunction>();

  // 实现数组项类型渲染
  renderArrayItemTypeRef.current = useCallback(
    (param: EditableProperty): React.ReactNode => {
      if (param.type !== "array") return null;

      const itemType = param.items?.type || "string";

      return (
        <div className="ml-4 mt-2 space-y-3 border-l-2 border-gray-200 pl-4">
          <div className="space-y-2">
            <Label className="text-xs text-gray-500"> Array Item Type</Label>
            <Select
              value={itemType}
              onValueChange={(value: ToolPropertyType) =>
                updateArrayItemType(param.id, value)
              }
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="string">String</SelectItem>
                <SelectItem value="number">Number</SelectItem>
                <SelectItem value="boolean">Boolean</SelectItem>
                <SelectItem value="object">Object</SelectItem>
              </SelectContent>
            </Select>

            {/* 如果数组项是对象类型，渲染对象属性编辑器 */}
            {itemType === "object" && param.items && (
              <div className="mt-2">
                <Label className="text-xs text-gray-500">
                  Array Item Properties
                </Label>
                {renderObjectPropertiesRef.current?.({
                  ...param.items,
                  id: `${param.id}_item`,
                  type: "object",
                })}
              </div>
            )}
          </div>
        </div>
      );
    },
    [updateArrayItemType],
  );

  // 实现对象属性渲染
  renderObjectPropertiesRef.current = useCallback(
    (param: EditableProperty, parentPath: string = ""): React.ReactNode => {
      if (param.type !== "object") return null;

      const currentPath = parentPath ? `${parentPath}/${param.id}` : param.id;
      const properties = param.properties || {};

      return (
        <div className="space-y-2 bg-muted p-2 rounded-lg">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => addObjectProperty(currentPath)}
            >
              <PlusCircle className="mr-1 h-3.5 w-3.5" />
              Add Property
            </Button>
          </div>

          <div className="space-y-3">
            {Object.entries(properties).map(
              ([propId, prop]: [string, EditableProperty]) => (
                <div
                  key={propId}
                  className="group relative rounded-lg bg-muted-foreground/10 p-2"
                >
                  <div className="mb-2 flex items-center space-x-2">
                    <Input
                      variant="ghost"
                      placeholder="属性名称"
                      className="h-7 text-xs"
                      value={prop.name}
                      onChange={(e) => {
                        updateObjectProperty(currentPath, propId, {
                          name: e.target.value,
                        });
                      }}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50"
                      onClick={() => removeObjectProperty(currentPath, propId)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-500" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">Type</Label>
                      <Select
                        value={prop.type}
                        onValueChange={(value: ToolPropertyType) =>
                          updateObjectProperty(currentPath, propId, {
                            type: value,
                          })
                        }
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="number">Number</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="array">Array</SelectItem>
                          <SelectItem value="object">Object</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs text-gray-500">
                        Description
                      </Label>
                      <Input
                        className="h-7 text-xs bg-white"
                        placeholder="Description"
                        value={prop.description || ""}
                        onChange={(e) =>
                          updateObjectProperty(currentPath, propId, {
                            description: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  {/* 递归渲染嵌套的对象属性 */}
                  {prop.type === "object" && (
                    <div className="mt-2 border-l-2 border-gray-200">
                      {renderObjectPropertiesRef.current?.(prop, currentPath)}
                    </div>
                  )}

                  {/* 渲染数组项的属性 */}
                  {prop.type === "array" &&
                    renderArrayItemTypeRef.current?.(prop)}
                </div>
              ),
            )}
          </div>
        </div>
      );
    },
    [addObjectProperty, removeObjectProperty, updateObjectProperty],
  );

  // 渲染参数卡片
  const renderParameterCard = useCallback(
    (param: EditableProperty) => {
      return (
        <Card key={param.id} className="p-2">
          <div className="flex flex-col gap-2">
            <div className="flex-1 flex items-center gap-2">
              <Input
                className="font-medium"
                placeholder="parameter name"
                variant="ghost"
                value={param.name}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) =>
                  updateParam(param.id, { name: e.target.value })
                }
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeParam(param.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1">
              <Input
                placeholder="description"
                value={param.description || ""}
                onChange={(e) =>
                  updateParam(param.id, { description: e.target.value })
                }
              />
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <Select
                  value={param.type}
                  onValueChange={(value: ToolPropertyType) =>
                    updateParam(param.id, { type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="string">String</SelectItem>
                    <SelectItem value="number">Number</SelectItem>
                    <SelectItem value="boolean">Boolean</SelectItem>
                    <SelectItem value="array">Array</SelectItem>
                    <SelectItem value="object">Object</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Label>Required</Label>
                <Switch
                  checked={param.required}
                  onCheckedChange={(checked) =>
                    updateParam(param.id, { required: checked })
                  }
                />
              </div>
            </div>
            {renderObjectPropertiesRef.current?.(param)}
          </div>
        </Card>
      );
    },
    [updateParam, removeParam],
  );

  // 渲染参数列表
  const renderParameters = useMemo(() => {
    return (
      <div className="space-y-2">{editableParams.map(renderParameterCard)}</div>
    );
  }, [editableParams, addParam, renderParameterCard]);

  // 渲染节点内容
  return (
    <>
      <NodePortal
        {...props}
        left={0}
        right={1}
        variant="start"
        title="Start Node"
      >
        <div
          onClick={() => setDrawerOpen(true)}
          className="rounded-md transition-all duration-200 cursor-pointer bg-muted-foreground/5 hover:bg-muted-foreground/10 text-xs p-2"
        >
          {editableParams.length === 0 ? (
            <div className="text-center text-gray-500 w-full">
              No parameters, click to set
            </div>
          ) : (
            <div className="space-y-1">
              {editableParams.map((param) => (
                <div key={param.id} className="flex items-center text-xs">
                  <span className="font-medium">{param.name}:</span>
                  <span className="ml-1 text-gray-500">{param.type}</span>
                  {param.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </NodePortal>

      <Drawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        title={
          <span className="flex items-center justify-between">
            <h3 className="font-bold">Node Configuration</h3>
            <div className="flex items-center justify-end">
              <Button onClick={addParam}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Parameter
              </Button>
            </div>
          </span>
        }
      >
        <div className="flex-1 overflow-y-auto">{renderParameters}</div>
      </Drawer>
    </>
  );
};

export const StartNode = memo(StartNodeComponent);
export class StartNodeExecutor extends NodeExecutor {
  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs: inputs || {},
      });

      const result = {
        success: true,
        data: inputs || {},
      };

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: result.data,
        },
        endTime: new Date().toISOString(),
      });

      return result;
    } catch (error) {
      this.updateNodeState({
        status: "failed",
        error: error instanceof Error ? error.message : String(error),
        endTime: new Date().toISOString(),
      });
      return super.createErrorResult(error);
    }
  }
}

NodeExecutor.register("start", StartNodeExecutor);
