import { PluginProps } from "@/common/types/plugin";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tags as t } from "@lezer/highlight";
import { motion } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cmd } from "@/utils/shell";
import { useCallback, useEffect, useState } from "react";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import {
  TbBook,
  TbDatabaseCog,
  TbMaximize,
  TbMinimize,
  TbPlug,
  TbPlus,
  TbTestPipe,
  TbUpload,
} from "react-icons/tb";
import { EnvEditor } from "./EnvEditor";
import { PluginManager } from "./PluginManager";
import { PluginsMarket } from "./components/PluginsMarket";
import { TestDrawer } from "./components/TestDrawer";

import { dialog } from "@/components/custom/DialogModal";
import { javascript } from "@codemirror/lang-javascript";
import { githubDarkInit } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { toast } from "sonner";
// 默认插件属性
const defaultPluginProps: Partial<PluginProps> = {
  name: "New Plugin",
  description: "Please add plugin description",
  version: "1.0.0",
  tools: [],
};

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
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 处理测试工具变化
  const handleTestToolChange = (value: string) => {
    setTestTool(value);
    setResult(null); // 重置测试结果
  };

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
      cmd.message(`load plugins error: ${message}`, "error");
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
        setResult(null); // 重置测试结果
        setTestTool(""); // 重置选中的测试工具
      }
    } catch (error) {
      console.error("load plugin error:", error);
      cmd.message("load plugin error", "error");
    }
  }, []);

  const handleRemovePlugin = async (id: string) => {
    try {
      const confirm = await cmd.confirm("Are you sure to delete the plugin?");
      if (!confirm) return;
      await cmd.invoke("plugin_remove", { id });
      PluginManager.delete(id);
      if (selectedPlugin?.id === id) {
        setSelectedPlugin(undefined);
        setContent("");
      }
    } catch (error) {
      console.error("delete plugin error:", error);
      cmd.message("delete plugin error", "error");
    }
  };

  // 导入工具
  const handleImportPlugin = useCallback(async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "Select TypeScript Plugin File",
          filters: { TypeScriptFile: ["ts"] },
        },
      );

      if (!result?.content) return;

      const pluginInfo = await cmd.invoke<PluginProps>("plugin_import", {
        content: result.content.trim(),
      });

      await loadPlugins();
      cmd.message(`success import plugin: ${pluginInfo.name}`, "success");
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      cmd.message(`import plugin error: ${message}`, "error");
    }
  }, [loadPlugins]);

  // 更新插件
  const handleUpdate = async () => {
    if (isSubmitting || !content) return;

    try {
      setIsSubmitting(true);
      if (!selectedPlugin) {
        return;
      }
      if (selectedPlugin.id === "new") {
        // 创建新插件
        const result = await cmd.invoke<PluginProps>("plugin_import", {
          content: content,
        });
        PluginManager.set({
          [result.id]: result,
        });
        setSelectedPlugin(result);
        cmd.message("success create plugin", "success");
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
        cmd.message("success update plugin", "success");
      }
    } catch (error) {
      console.error(error);
      toast.error(JSON.stringify(error || { error: "unknown error" }));
    } finally {
      setIsSubmitting(false);
    }
  };

  // 测试插件
  const handleTest = async (tool: string) => {
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
      console.error(error);
      cmd.message("test plugin error", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdd = () => {
    setSelectedPlugin({
      ...defaultPluginProps,
      id: "new",
    } as PluginProps);
    setContent("");
  };

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  return (
    <PreferenceLayout>
      <PreferenceList
        left={
          <Button
            onClick={() => {
              dialog({
                title: "Plugins Market",
                content: <PluginsMarket />,
              });
            }}
            variant="outline"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            Plugins Market
          </Button>
        }
        right={
          <>
            {" "}
            <Button className="flex-1" onClick={handleAdd}>
              <TbPlus className="w-4 h-4" />
              <span>Add Plugin</span>
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
                  <span>Environment Variables</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleImportPlugin}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>Import TypeScript Plugin</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="Plugin supported: You can extend the function by writing a TypeScript plugin. Please refer to the development documentation for more information."
        items={Object.values(plugins).map((plugin) => ({
          id: plugin.id,
          title: plugin.name || "Unnamed Plugin",
          description: plugin.description || "No description",
          onClick: () => loadPluginContent(plugin.id),
          actived: selectedPlugin?.id === plugin.id,
          onRemove: () => handleRemovePlugin(plugin.id),
        }))}
        emptyText="No plugins, click the button above to add a new plugin"
        EmptyIcon={TbPlus}
      />
      <motion.div
        layout
        className={cn("flex flex-1 flex-col h-full overflow-hidden", {
          "fixed inset-0 top-12 z-50 bg-background h-auto": isFullscreen,
        })}
        initial={false}
        animate={{
          scale: isFullscreen ? 1 : 1,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        <PreferenceBody
          emptyText="Please select a plugin or click the add button to create a new plugin"
          EmptyIcon={TbPlug}
          isEmpty={!selectedPlugin && !content}
          className={cn("rounded-xl flex-1", {
            "mb-4": isFullscreen,
          })}
          header={
            <div className="flex items-center justify-between w-full">
              <h3 className="text-base font-semibold">
                {selectedPlugin?.name || "Unnamed Plugin"}
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    cmd.invoke("open_url", {
                      url: "https://ghostie.wangenius.com/tutorials/plugin",
                    });
                  }}
                  variant="ghost"
                >
                  <TbBook className="w-4 h-4" />
                  Documentation
                </Button>
                <Button onClick={handleToggleFullscreen} variant="ghost">
                  {isFullscreen ? (
                    <>
                      <TbMinimize className="w-4 h-4" />
                      Exit Fullscreen
                    </>
                  ) : (
                    <>
                      <TbMaximize className="w-4 h-4" />
                      Fullscreen
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => setIsTestDrawerOpen(true)}
                  variant="ghost"
                  className="gap-2"
                >
                  <TbTestPipe className="w-4 h-4" />
                  Test
                </Button>
                <Button
                  variant="primary"
                  onClick={handleUpdate}
                  disabled={!content || isSubmitting}
                >
                  <TbUpload className="w-4 h-4" />
                  {isSubmitting
                    ? selectedPlugin
                      ? "Updating..."
                      : "Creating..."
                    : selectedPlugin
                    ? "Update"
                    : "Create"}
                </Button>
              </div>
            </div>
          }
        >
          <CodeMirror
            className={cn("h-full overflow-y-auto", {
              "h-auto": isFullscreen,
            })}
            value={content}
            theme={githubDarkInit({
              settings: {
                fontSize: 16,
                background: "#292d3e",
              },
              styles: [
                {
                  tag: t.keyword,
                  color: "#bd66d8",
                },
                {
                  tag: t.variableName,
                  color: "#8aa9f9",
                },
                {
                  tag: t.string,
                  color: "#ffffbbbb",
                },
                {
                  tag: t.number,
                  color: "#ae81ff",
                },
                {
                  tag: t.comment,
                  color: "#ffffff88",
                },
                {
                  tag: t.className,
                  color: "#66d9ef",
                },
              ],
            })}
            extensions={[javascript({ typescript: true })]}
            onChange={setContent}
            placeholder={`Write your plugin code, refer to the development documentation`}
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
        </PreferenceBody>
      </motion.div>
      <TestDrawer
        open={isTestDrawerOpen}
        onOpenChange={setIsTestDrawerOpen}
        selectedPlugin={selectedPlugin}
        testTool={testTool}
        testArgs={testArgs}
        result={result}
        isSubmitting={isSubmitting}
        onTestToolChange={handleTestToolChange}
        onTestArgsChange={setTestArgs}
        onTest={handleTest}
      />
    </PreferenceLayout>
  );
}
