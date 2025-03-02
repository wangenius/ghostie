import { PluginProps, ToolProperty } from "@/common/types/plugin";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cmd } from "@/utils/shell";
import { useCallback, useEffect, useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbDatabaseCog,
  TbPlus,
  TbUpload,
  TbTrash,
  TbPlug,
  TbTestPipe,
  TbLoader2,
  TbBook,
} from "react-icons/tb";
import { EnvEditor } from "./EnvEditor";
import { PluginManager } from "./PluginManager";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { javascript } from "@codemirror/lang-javascript";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Drawer } from "@/components/ui/drawer";
import JsonViewer from "@/components/custom/JsonViewer";
import { gen } from "@/utils/generator";

// 默认插件属性
const defaultPluginProps: Partial<PluginProps> = {
  name: "新插件",
  description: "请添加插件描述",
  version: "1.0.0",
  tools: [],
};

// ParamInput 组件
interface ParamInputProps {
  property: ToolProperty;
  name: string;
  value: unknown;
  onChange: (value: unknown) => void;
  path?: string[];
}

function ParamInput({
  property,
  name,
  value,
  onChange,
  path = [],
}: ParamInputProps): JSX.Element {
  const currentPath = [...path, name];

  switch (property.type) {
    case "object":
      return (
        <div className="pl-4 flex items-center justify-between gap-2">
          <label className="block text-xs font-medium text-muted-foreground">
            {name}
          </label>
          {property.properties &&
            Object.entries(property.properties).map(([key, prop]) => (
              <ParamInput
                key={key}
                name={key}
                property={prop}
                value={
                  value && typeof value === "object"
                    ? (value as Record<string, unknown>)[key]
                    : undefined
                }
                onChange={(newValue) => {
                  const newObj = {
                    ...(value && typeof value === "object" ? value : {}),
                  } as Record<string, unknown>;
                  if (newValue === undefined) {
                    delete newObj[key];
                  } else {
                    newObj[key] = newValue;
                  }
                  onChange(newObj);
                }}
                path={currentPath}
              />
            ))}
        </div>
      );
    case "array":
      return (
        <div className="pl-4 flex items-center justify-between gap-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Input
            value={Array.isArray(value) ? value.join(",") : ""}
            onChange={(e) =>
              onChange(e.target.value.split(",").filter(Boolean))
            }
            placeholder={property.description || "输入数组值，用逗号分隔"}
          />
        </div>
      );
    case "boolean":
      return (
        <div className="pl-4 flex items-center justify-between gap-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Select
            value={String(value)}
            onValueChange={(v) => onChange(v === "true")}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择布尔值" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">是</SelectItem>
              <SelectItem value="false">否</SelectItem>
            </SelectContent>
          </Select>
        </div>
      );
    default:
      return (
        <div className="pl-4 flex items-center justify-between gap-2">
          <label className="block text-xs text-muted-foreground">{name}</label>
          <Input
            value={value ? String(value) : ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={property.description}
            type={property.type === "number" ? "number" : "text"}
          />
        </div>
      );
  }
}

export function PluginsTab() {
  /* 插件列表 */
  const plugins = PluginManager.use();
  const [selectedPlugin, setSelectedPlugin] = useState<
    PluginProps | undefined
  >();
  /* 是否提交中 */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /* 测试参数 */
  const [testArgs, setTestArgs] = useState<Record<string, unknown>>({});
  /* 测试工具 */
  const [testTool, setTestTool] = useState<string>("");
  /* 脚本内容 */
  const [content, setContent] = useState("");
  /* 测试抽屉是否打开 */
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  /* 测试结果 */
  const [result, setResult] = useState<any>(null);

  // 加载插件列表
  const loadPlugins = useCallback(async () => {
    try {
      /* 获取工具列表 */
      const plugins = await cmd.invoke<Record<string, PluginProps>>(
        "plugins_list",
      );
      PluginManager.set(plugins);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      cmd.message(`加载插件列表失败: ${message}`, "error");
    }
  }, []);

  // 初始加载
  useEffect(() => {
    loadPlugins();
  }, [loadPlugins]);

  // 加载插件内容
  const loadPluginContent = useCallback(async (id: string) => {
    try {
      const plugin = await cmd.invoke<{ info: PluginProps; content: string }>(
        "plugin_get",
        { id },
      );
      if (plugin) {
        setSelectedPlugin(plugin.info);
        setContent(plugin.content);
      }
    } catch (error) {
      console.error("加载插件失败:", error);
      cmd.message("加载插件失败", "error");
    }
  }, []);

  const handleRemovePlugin = async (id: string) => {
    try {
      const confirm = await cmd.confirm("确定删除插件吗？");
      if (!confirm) return;
      await cmd.invoke("plugin_remove", { id });
      PluginManager.delete(id);
      if (selectedPlugin?.id === id) {
        setSelectedPlugin(undefined);
        setContent("");
      }
    } catch (error) {
      console.error("删除插件失败:", error);
      cmd.message("删除插件失败", "error");
    }
  };

  // 导入工具
  const handleImportPlugin = useCallback(async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "选择 TypeScript 插件文件",
          filters: { TypeScript文件: ["ts"] },
        },
      );

      if (!result?.content) return;

      const pluginInfo = await cmd.invoke<PluginProps>("plugin_import", {
        content: result.content.trim(),
      });

      await loadPlugins();
      cmd.message(`成功导入插件: ${pluginInfo.name}`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      cmd.message(`导入插件失败: ${message}`, "error");
    }
  }, [loadPlugins]);

  // 更新插件
  const handleUpdate = async () => {
    if (isSubmitting || !content) return;

    try {
      setIsSubmitting(true);
      if (!selectedPlugin) {
        // 创建新插件
        const result = await cmd.invoke<PluginProps>("plugin_import", {
          content: content,
        });
        PluginManager.set({
          [result.id]: result,
        });
        setSelectedPlugin(result);
        cmd.message("创建成功", "success");
      } else {
        // 更新现有插件
        const result = await cmd.invoke<PluginProps>("plugin_update", {
          id: selectedPlugin.id,
          content: content,
        });
        if (result) {
          PluginManager.set({
            [result.id]: result,
          });
          setSelectedPlugin(result);
        }
        cmd.message("更新成功", "success");
      }
    } catch (error) {
      console.error(error);
      cmd.message(
        JSON.stringify(error || { error: "未知错误" }),
        selectedPlugin ? "更新失败" : "创建失败",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 测试插件
  const test = async (tool: string) => {
    try {
      if (!selectedPlugin) return;
      setIsSubmitting(true);
      const result = await cmd.invoke("plugin_execute", {
        id: selectedPlugin.id,
        tool: tool,
        args: testArgs,
      });
      setResult(result);
    } catch (error) {
      console.log(error);
      cmd.message("请打开调试窗口查看错误信息", "测试失败", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parameters = selectedPlugin?.tools.find(
    (tool) => tool.name === testTool,
  )?.parameters;

  return (
    <div className="h-full flex overflow-hidden">
      {/* 左侧列表 */}
      <div className="w-[400px] bg-muted flex flex-col h-full overflow-auto rounded-xl p-2 gap-2">
        <div className="flex-none flex justify-end items-center">
          <div className="flex items-center gap-2">
            <Button
              className="flex-1"
              onClick={() => {
                setSelectedPlugin({
                  ...defaultPluginProps,
                  id: gen.id(),
                } as PluginProps);
                setContent("");
              }}
            >
              <TbPlus className="w-4 h-4 mr-2" />
              添加插件
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => EnvEditor.open()}>
                  <TbDatabaseCog className="w-4 h-4 mr-2" />
                  <span>环境变量</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleImportPlugin}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>导入 TypeScript 插件</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            插件支持: 可以通过编写 TypeScript
            插件来扩展功能。请参考开发文档了解更多信息。
          </p>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 space-y-2 p-1">
          {Object.values(plugins).map((plugin) => {
            if (!plugin) return null;
            return (
              <div
                key={plugin.id}
                className={cn(
                  "group relative px-4 py-3 rounded-lg transition-all hover:bg-muted-foreground/10 select-none cursor-pointer",
                  selectedPlugin?.id === plugin.id
                    ? "bg-primary/10 ring-1 ring-primary/20"
                    : "bg-background",
                )}
                onClick={() => {
                  loadPluginContent(plugin.id);
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm truncate">
                        {plugin.name || "未命名插件"}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground truncate">
                      {plugin.description || "暂无描述"}
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePlugin(plugin.id);
                    }}
                  >
                    <TbTrash className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 右侧编辑区域 */}
      <div className="flex-1 min-w-0 h-full overflow-hidden flex flex-col">
        {selectedPlugin || content ? (
          <div className="flex-1 flex flex-col px-4 pt-4 overflow-hidden h-full space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold">
                {selectedPlugin?.name || "未命名插件"}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    window.open(
                      "https://ccn0kkxjz1z2.feishu.cn/wiki/MxzywoXxaiyF08kRREkcEl1Vnfh",
                    );
                  }}
                  variant="ghost"
                >
                  <TbBook className="w-4 h-4" />
                  开发文档
                </Button>
                <Button
                  onClick={() => setIsTestDrawerOpen(true)}
                  variant="ghost"
                  className="gap-2"
                >
                  <TbTestPipe className="w-4 h-4" />
                  测试
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdate}
                  disabled={!content || isSubmitting}
                >
                  <TbUpload className="w-4 h-4" />
                  {isSubmitting
                    ? selectedPlugin
                      ? "更新中..."
                      : "创建中..."
                    : selectedPlugin
                    ? "更新"
                    : "创建"}
                </Button>
              </div>
            </div>

            <div className="flex-1 rounded-lg border focus-within:border-primary/40 overflow-hidden p-2 h-full">
              <CodeMirror
                className="h-full overflow-y-auto"
                value={content}
                theme={githubLight}
                extensions={[javascript({ typescript: true })]}
                onChange={(value) => setContent(value)}
                placeholder={`编写你的插件代码, 参考开发文档`}
                basicSetup={{
                  lineNumbers: false,
                  highlightActiveLineGutter: true,
                  highlightSpecialChars: true,
                  foldGutter: false,
                  drawSelection: true,
                  dropCursor: true,
                  allowMultipleSelections: true,
                  indentOnInput: true,
                  syntaxHighlighting: true,
                  autocompletion: true,
                  lintKeymap: true,
                }}
              />
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-muted-foreground flex-col gap-3">
            <TbPlug className="w-12 h-12 text-muted-foreground/50" />
            <p>请选择一个插件或点击添加按钮创建新插件</p>
          </div>
        )}

        {/* 测试抽屉 */}
        <Drawer
          direction="right"
          open={isTestDrawerOpen}
          onOpenChange={setIsTestDrawerOpen}
          className="w-[380px]"
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-1">测试工具</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    选择要测试的工具并配置相关参数
                  </p>
                  <Select
                    value={testTool}
                    onValueChange={(value) => setTestTool(value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="选择测试工具" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPlugin?.tools.map((tool) => (
                        <SelectItem key={tool.name} value={tool.name}>
                          {tool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {testTool && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                      测试参数配置
                    </h4>
                    <div className="space-y-4">
                      {parameters &&
                        Object.entries(parameters.properties || {}).map(
                          ([key, property]) => (
                            <div
                              key={key}
                              className="bg-background rounded-md p-3"
                            >
                              <ParamInput
                                name={key}
                                property={property}
                                value={testArgs[key]}
                                onChange={(value) =>
                                  setTestArgs((prev) => ({
                                    ...prev,
                                    [key]: value,
                                  }))
                                }
                              />
                            </div>
                          ),
                        )}
                    </div>
                  </div>
                )}

                {result && (
                  <div className="bg-muted/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary"></span>
                      测试结果
                    </h4>
                    <JsonViewer data={result} />
                  </div>
                )}
              </div>
            </div>

            {/* 底部按钮区域 */}
            <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
              <Button
                disabled={!testTool}
                onClick={() => test(testTool)}
                className="w-full h-11 text-base font-medium"
                variant="default"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <TbLoader2 className="w-4 h-4 animate-spin" />
                    测试运行中...
                  </span>
                ) : (
                  "运行测试"
                )}
              </Button>
            </div>
          </div>
        </Drawer>
      </div>
    </div>
  );
}
