import { PluginProps, ToolProperty } from "@/common/types/plugin";
import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cmd } from "@/utils/shell";
import { javascript } from "@codemirror/lang-javascript";
import { useQuery } from "@hook/useQuery";
import { githubLight } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { useCallback, useEffect, useState } from "react";
import { TbBook } from "react-icons/tb";
import { PluginManager } from "./PluginManager";
import { AnimateSuspense } from "@/components/custom/AnimateSuspense";
import { LoadingSpin } from "@/components/custom/LoadingSpin";
// 添加新的 ParamInput 组件
interface ParamInputProps {
  property: ToolProperty;
  name: string;
  value: any;
  onChange: (value: any) => void;
  path?: string[];
}

function ParamInput({
  property,
  name,
  value,
  onChange,
  path = [],
}: ParamInputProps) {
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
                value={value?.[key]}
                onChange={(newValue) => {
                  const newObj = { ...(value || {}) };
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
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={property.description}
            type={property.type === "number" ? "number" : "text"}
          />
        </div>
      );
  }
}

export function PluginEditor() {
  /* 是否提交中 */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /* 是否创建 */
  const [create, setCreate] = useState(true);
  /* 测试参数 */
  const [testArgs, setTestArgs] = useState<Record<string, string>>({});
  /* 查询地址参数 */
  const { value: query } = useQuery("id");
  /* 插件 */
  const [plugin, setPlugin] = useState<PluginProps | undefined>();
  /* 测试工具 */
  const [testTool, setTestTool] = useState<string>("");
  /* 脚本内容 */
  const [content, setContent] = useState("");

  const init = useCallback(async () => {
    try {
      if (query !== "new") {
        setCreate(false);
        const plugin = await cmd.invoke<{ info: PluginProps; content: string }>(
          "plugin_get",
          { id: query },
        );
        if (plugin) {
          setPlugin(plugin.info);
          setContent(plugin.content);
        } else {
          setCreate(true);
          setPlugin(undefined);
          setContent("");
        }
      } else {
        setCreate(true);
        setPlugin(undefined);
        setContent("");
        setTestArgs({});
        setTestTool("");
      }
    } catch (error) {
      console.error("加载插件失败:", error);
      handleClose();
    }
  }, [query]);

  useEffect(() => {
    init();
  }, [query]);

  const handleClose = async () => {
    setPlugin(undefined);
    setContent("");
    setCreate(true);
    cmd.close();
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      if (create) {
        // 如果是创建新插件，使用 plugin_import
        const result = await cmd.invoke<PluginProps>("plugin_import", {
          content: content,
        });
        PluginManager.set({
          [result.id]: result,
        });
        PluginEditor.open(result.id);
        init();
      } else if (plugin) {
        // 如果是更新现有插件，使用 plugin_update
        const result = await cmd.invoke<PluginProps>("plugin_update", {
          id: plugin.id,
          content: content,
        });
        if (result) {
          PluginManager.set({
            [result.id]: result,
          });
        }

        cmd.message("更新成功", "success");
      }
    } catch (error) {
      console.error(error);
      cmd.message(
        JSON.stringify(error || { error: "未知错误" }),
        create ? "创建失败" : "更新失败",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const test = async (tool: string) => {
    try {
      if (!plugin) return;
      setIsSubmitting(true);
      console.log({
        id: plugin.id,
        tool: tool,
        args: testArgs,
      });

      // 直接使用当前编辑的脚本和依赖进行测试
      const result = await cmd.invoke("plugin_execute", {
        id: plugin.id,
        tool: tool,
        args: testArgs,
      });
      console.log(result);
      cmd.message(JSON.stringify(result).slice(0, 200), "测试成功");
    } catch (error) {
      console.log(error);
      cmd.message("请打开调试窗口查看错误信息", "测试失败", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const parameters = plugin?.tools.find(
    (tool) => tool.name === testTool,
  )?.parameters;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header title={create ? "添加插件" : "编辑插件"} close={handleClose} />

      <AnimateSuspense
        fallback={<LoadingSpin />}
        deps={[query]}
        className="flex-1 overflow-hidden flex"
      >
        {/* 左侧代码编辑区域 */}
        <div className="flex-1 p-4 overflow-auto flex flex-col">
          <div className="mb-4">
            <h3 className="text-lg font-medium">{plugin?.name}</h3>
            <p className="text-sm text-muted-foreground">
              {plugin?.description}
            </p>
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center justify-between">
              <label className="block text-xs text-muted-foreground">
                脚本内容
              </label>
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
            </div>
            <div className="rounded-md overflow-hidden flex-1 border focus-within:border-primary/40">
              <CodeMirror
                value={content}
                height="calc(100vh - 300px)"
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
          <div className="mt-4">
            <Button
              variant="primary"
              onClick={handleUpdate}
              disabled={!content || isSubmitting}
              className="w-full h-12 text-lg"
            >
              {isSubmitting
                ? create
                  ? "创建中..."
                  : "更新中..."
                : create
                ? "创建"
                : "更新"}
            </Button>
          </div>
        </div>

        {/* 右侧测试区域 */}
        <div className="w-[400px] flex flex-col">
          <div className="flex-1 p-4 overflow-auto">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-muted-foreground">
                  测试工具
                </label>
                <Select
                  value={testTool}
                  onValueChange={(value) => setTestTool(value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择测试工具" />
                  </SelectTrigger>
                  <SelectContent>
                    {plugin?.tools.map((tool) => (
                      <SelectItem key={tool.name} value={tool.name}>
                        {tool.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {testTool && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-muted-foreground">
                    测试参数
                  </label>
                  <div className="space-y-3">
                    {parameters &&
                      Object.entries(parameters.properties || {}).map(
                        ([key, property]) => (
                          <ParamInput
                            key={key}
                            name={key}
                            property={property}
                            value={testArgs[key]}
                            onChange={(value) =>
                              setTestArgs((prev) => ({ ...prev, [key]: value }))
                            }
                          />
                        ),
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 底部按钮区域 */}
          <div className="p-4">
            <Button
              disabled={!testTool}
              onClick={() => test(testTool)}
              className="w-full h-12 text-lg"
              variant="secondary"
            >
              运行测试
            </Button>
          </div>
        </div>
      </AnimateSuspense>
    </div>
  );
}

/**
 * 打开插件编辑页面
 * @param id 插件id
 */
PluginEditor.open = (id: string = "new") => {
  cmd.open("plugin-edit", { id }, { width: 1200, height: 800 });
};
