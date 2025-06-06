import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { motion } from "framer-motion";
import { useCallback, useRef, useState, useEffect } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbCode,
  TbCodeAsterisk,
  TbDots,
  TbFileText,
  TbMaximize,
  TbMinimize,
  TbPackage,
  TbPlayerPlay,
  TbPlug,
  TbPlus,
  TbScriptPlus,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { TestDrawer } from "./components/TestDrawer";

import { dialog } from "@/components/custom/DialogModal";
import { Echoi } from "@/lib/echo/Echo";
import { ToolkitStore, Toolkit } from "@/toolkit/Toolkit";
import { javascript } from "@codemirror/lang-javascript";
import { githubDarkInit } from "@uiw/codemirror-theme-github";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { toJS } from "mobx";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import { format } from "prettier/standalone";
import { toast } from "sonner";
import { NodeDeps } from "./NodeDeps";
import { ToolkitCloudManager } from "@/cloud/ToolkitCloudManager";

const CurrentPlugin = new Echoi<Toolkit>(new Toolkit());

export function ToolkitTab() {
  /* 是否提交中 */
  const [isSubmitting, setIsSubmitting] = useState(false);
  /* 测试参数 */
  const [testArgs, setTestArgs] = useState<Record<string, unknown>>({});
  /* 测试工具 */
  const [testTool, setTestTool] = useState<string>("");
  /* 测试抽屉是否打开 */
  const [isTestDrawerOpen, setIsTestDrawerOpen] = useState(false);
  /* 测试结果 */
  const [result, setResult] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /* 插件是否已在市场中 */
  const [isPluginInMarket, setIsPluginInMarket] = useState(false);
  /* CodeMirror 实例引用 */
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const plugin = CurrentPlugin.use();
  const plugins = ToolkitStore.use();
  const props = plugins[plugin.props.id];
  const content = plugin.content || "";

  // 检查插件是否已在市场中
  useEffect(() => {
    if (props?.id) {
      ToolkitCloudManager.checkPluginExists(props.id)
        .then((exists) => {
          setIsPluginInMarket(exists);
        })
        .catch((error) => {
          console.error("Failed to check plugin market status:", error);
          setIsPluginInMarket(false);
        });
    } else {
      setIsPluginInMarket(false);
    }
  }, [props?.id]);

  // 处理测试工具变化
  const handleTestToolChange = (value: string) => {
    setTestTool(value);
    setResult(null); // 重置测试结果
  };

  // 测试插件
  const handleTest = async (tool: string) => {
    try {
      if (!props.id) return;
      setIsSubmitting(true);
      const result = await plugin.execute(tool, testArgs);
      setResult(result);
    } catch (error) {
      console.error(error);
      toast.error(`test plugin error: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = useCallback(async () => {
    const plugin = await Toolkit.create();
    /* 保存到插件存储 */
    ToolkitStore.set({
      [plugin.props.id]: toJS(plugin.props),
    });
    CurrentPlugin.set(plugin, { replace: true });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleUpload = useCallback(async () => {
    if (!props.id) return;

    // 使用状态中的isPluginInMarket值，无需重新查询
    dialog.confirm({
      title: isPluginInMarket ? "更新插件" : "上传插件",
      content: isPluginInMarket
        ? `您确定要更新插件 "${plugin.props.name}" 吗？这将覆盖市场中的现有版本。`
        : `您确定要上传插件 "${plugin.props.name}" 到市场吗？`,
      onOk: async () => {
        try {
          await ToolkitCloudManager.uploadToMarket(plugin);

          // 根据操作类型显示不同的提示信息
          if (isPluginInMarket) {
            toast.success("插件已成功更新，等待审核");
          } else {
            toast.success("插件已成功上传，等待审核");
            // 更新状态
            setIsPluginInMarket(true);
          }
        } catch (error) {
          console.error("plugin operation failed:", error);
          toast.error(
            `${isPluginInMarket ? "更新" : "上传"}插件失败: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      },
    });
  }, [props, plugin, isPluginInMarket]);

  // 处理代码格式化
  const handleFormatCode = useCallback(async () => {
    const view = editorRef.current?.view;
    const currentContent = view?.state.doc.toString();
    if (!view || !currentContent) return;

    try {
      const formattedContent = await format(currentContent, {
        parser: "babel-ts",
        plugins: [prettierPluginBabel, prettierPluginEstree as any],
        semi: true,
        singleQuote: false,
        tabWidth: 2,
      });

      // 更新编辑器内容
      view.dispatch({
        changes: {
          from: 0,
          to: view.state.doc.length,
          insert: formattedContent,
        },
      });
    } catch (error) {
      cmd.message(
        `Failed to format code: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    }
  }, []);

  return (
    <PreferenceLayout>
      <PreferenceList
        left={
          <Button onClick={() => NodeDeps.open()} variant="ghost">
            <TbPackage className="w-4 h-4" />
            依赖管理
          </Button>
        }
        right={
          <>
            <Button className="flex-1" onClick={handleCreate}>
              <TbScriptPlus className="w-4 h-4" />
              New
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    cmd.invoke("code_plugins");
                  }}
                >
                  <TbCode className="w-4 h-4" />
                  代码打开插件位置
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={Object.values(plugins).map((plugin) => ({
          id: plugin.id,
          content: (
            <div className="flex flex-col items-start gap-1">
              <span className="font-bold text-sm truncate">
                {plugin.name || "Unnamed Plugin"}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-1">
                {plugin.description || "No description"}
              </span>
            </div>
          ),
          onClick: async () => {
            CurrentPlugin.set(await Toolkit.get(plugin.id), {
              replace: true,
            });
          },
          actived: props?.id === plugin.id,
          onRemove: () => {
            dialog.confirm({
              title: "Delete Plugin",
              content: `Are you sure to delete this plugin ${plugin.name}?`,
              onOk() {
                Toolkit.delete(plugin.id);
                if (props?.id === plugin.id) {
                  CurrentPlugin.temporary().reset();
                }
              },
            });
          },
        }))}
        emptyText="No plugins, click the button above to add a new plugin"
        EmptyIcon={TbPlus}
      />
      <motion.div
        layout
        className={cn("flex flex-1 flex-col h-full overflow-hidden", {
          "fixed inset-3 top-10 z-50 bg-background h-auto": isFullscreen,
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
          isEmpty={!props || !props.id}
          className={cn("rounded-xl flex-1")}
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">
                  {props?.name || "Unnamed Plugin"}
                </h3>
                <small
                  className={"bg-primary text-muted text-xs rounded-md px-2"}
                >
                  {props?.version || ""}
                </small>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    cmd.invoke("open_url", {
                      url: "https://ghostie.wangenius.com/docs/guide/plugin",
                    });
                  }}
                  variant="ghost"
                >
                  <TbFileText className="w-4 h-4" />
                  Documentation
                </Button>
                <Button
                  onClick={handleToggleFullscreen}
                  size="icon"
                  variant="ghost"
                  title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                >
                  {isFullscreen ? (
                    <TbMinimize className="w-4 h-4" />
                  ) : (
                    <TbMaximize className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  onClick={() => setIsTestDrawerOpen(true)}
                  variant="ghost"
                  size="icon"
                  title="Test Plugin"
                >
                  <TbPlayerPlay className="w-4 h-4" />
                </Button>
                <Button
                  onClick={handleFormatCode}
                  variant="ghost"
                  size="icon"
                  title="Format Code"
                >
                  <TbCodeAsterisk className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon">
                      <TbDots className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleUpload}>
                      <TbUpload className="w-4 h-4" />
                      {isPluginInMarket ? "更新到市场" : "上传到市场"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant={"destructive"}
                      onClick={async () => {
                        const res = await cmd.confirm(
                          `确认删除${plugin.props.name}?`,
                        );
                        if (res) {
                          Toolkit.delete(plugin.props.id);
                        }
                      }}
                    >
                      <TbTrash className="size-4" />
                      delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          }
        >
          <CodeMirror
            ref={editorRef}
            className={cn("h-full overflow-y-auto rounded-xl", {
              "h-auto": isFullscreen,
            })}
            key={props?.id}
            value={content}
            theme={githubDarkInit({
              settings: {
                fontSize: 16,
                background: "#333338",
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
            extensions={[
              javascript({ typescript: true }),
              EditorView.lineWrapping,
            ]}
            onChange={(value) => {
              plugin.updateContent(value.toString());
            }}
            placeholder={`Write your plugin code, refer to the development documentation`}
            basicSetup={{
              lineNumbers: true,
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
        selectedPlugin={props}
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
