import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import { EditorView } from "@codemirror/view";
import { tags as t } from "@lezer/highlight";
import { motion } from "framer-motion";
import { useCallback, useRef, useState } from "react";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import {
  TbCodeAsterisk,
  TbDatabaseCog,
  TbDots,
  TbFileText,
  TbMaximize,
  TbMinimize,
  TbPlayerPlay,
  TbPlug,
  TbPlus,
  TbScriptPlus,
  TbUpload,
} from "react-icons/tb";
import { EnvEditor } from "./EnvEditor";
import { PluginsMarket } from "./components/PluginsMarket";
import { TestDrawer } from "./components/TestDrawer";

import { dialog } from "@/components/custom/DialogModal";
import {
  PLUGIN_DATABASE_CONTENT,
  PluginStore,
  ToolPlugin,
} from "@/plugin/ToolPlugin";
import { supabase } from "@/utils/supabase";
import { javascript } from "@codemirror/lang-javascript";
import { githubDarkInit } from "@uiw/codemirror-theme-github";
import CodeMirror, { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { Echo } from "echo-state";
import * as prettierPluginBabel from "prettier/plugins/babel";
import * as prettierPluginEstree from "prettier/plugins/estree";
import { format } from "prettier/standalone";

const CurrentPlugin = new Echo<ToolPlugin>(new ToolPlugin());
const PluginContent = new Echo<string>(
  `/**
* @name write the plugin name here
* @description write the plugin description here
*/`,
).indexed({
  database: PLUGIN_DATABASE_CONTENT,
  name: "",
});

export function PluginsTab() {
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
  /* CodeMirror 实例引用 */
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const plugin = CurrentPlugin.use();
  const plugins = PluginStore.use();
  const props = plugins[plugin.props.id];
  const content = PluginContent.use();

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
      cmd.message("test plugin error", "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreate = useCallback(async () => {
    const plugin = await ToolPlugin.create();
    CurrentPlugin.set(plugin, { replace: true });
    PluginContent.indexed({
      database: PLUGIN_DATABASE_CONTENT,
      name: plugin.props.id,
    });
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  const handleUpload = useCallback(async () => {
    if (!props.id) return;
    dialog.confirm({
      title: "Upload Plugin",
      content: "Are you sure to upload this plugin?",
      onOk: async () => {
        try {
          const { error } = await supabase.from("plugins").insert({
            name: props.name,
            description: props.description || "",
            version: props.version || "1.0.0",
            content: content,
          });

          if (error) {
            throw error;
          }

          cmd.message(
            "plugin uploaded successfully, waiting for review",
            "success",
          );
        } catch (error) {
          console.error("failed to upload plugin:", error);
          cmd.message(
            `failed to upload plugin: ${
              error instanceof Error ? error.message : String(error)
            }`,
            "error",
          );
        }
      },
    });
  }, [props, content]);

  const handleImportPlugin = useCallback(() => {}, []);

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
          <Button
            onClick={() => {
              dialog({
                title: "Plugins Market",
                content: <PluginsMarket />,
              });
            }}
            className="bg-muted-foreground/10 hover:bg-muted-foreground/20"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            Plugins Market
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
                <DropdownMenuItem onClick={() => EnvEditor.open()}>
                  <TbDatabaseCog className="w-4 h-4" />
                  Environment Variables
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleImportPlugin}>
                  <TbUpload className="w-4 h-4" />
                  Import TypeScript Plugin
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        tips="Extend the tools by writing a plugin. Refer to the Documentation for more infos."
        items={Object.values(plugins).map((plugin) => ({
          id: plugin.id,
          title: plugin.name || "Unnamed Plugin",
          description: plugin.description || "No description",
          onClick: () => {
            CurrentPlugin.set(new ToolPlugin(plugin), { replace: true });
            PluginContent.indexed({
              database: PLUGIN_DATABASE_CONTENT,
              name: plugin.id,
            });
          },
          actived: props?.id === plugin.id,
          onRemove: () => {
            ToolPlugin.delete(plugin.id);
            if (props?.id === plugin.id) {
              CurrentPlugin.temporary().reset();
            }
          },
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
          isEmpty={!props?.id}
          className={cn("rounded-xl flex-1", {
            "mb-4": isFullscreen,
          })}
          header={
            <div className="flex items-center justify-between w-full">
              <h3 className="text-base font-semibold">
                {props?.name || "Unnamed Plugin"}
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
                      Upload to Market
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
