import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { javascript } from "@codemirror/lang-javascript";
import { tags as t } from "@lezer/highlight";
import { githubDarkInit } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { motion } from "framer-motion";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { CodeNodeConfig } from "../types/nodes";
import { Workflow } from "../Workflow";
import { NodePortal } from "./NodePortal";

const CodeNodeComponent = (props: NodeProps<CodeNodeConfig>) => {
  const [open, setOpen] = useState(false);
  const workflow = Workflow.instance;
  const handleChange = useCallback(
    (value: string) => {
      workflow.set((state) => ({
        ...state,
        data: {
          ...state.data,
          nodes: {
            ...state.data.nodes,
            [props.id]: {
              ...state.data.nodes[props.id],
              data: { ...state.data.nodes[props.id].data, code: value },
            },
          },
        },
      }));
    },
    [workflow, props.id],
  );
  return (
    <NodePortal {...props} left={1} right={1} variant="code" title="代码">
      <motion.div
        className="flex flex-col gap-3 p-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg">
          <p className="text-xs text-muted-foreground">
            与【插件】不同，代码节点运行不支持本地操作。代码节点用来执行数据处理操作，过滤，排序。
          </p>
        </div>
        <Button
          className="bg-muted-foreground/10 hover:bg-muted-foreground/20 h-8"
          onClick={() => setOpen(true)}
        >
          编辑代码
        </Button>
      </motion.div>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="编辑代码"
        className="w-[600px]"
        description={
          <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg mx-3">
            <p className="text-xs text-muted-foreground">
              使用inputs作为输入。
            </p>
          </div>
        }
      >
        <div className="h-full flex flex-col flex-1">
          <CodeMirror
            className="h-full flex-1 overflow-y-auto rounded-lg"
            value={props.data.code}
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
            extensions={[javascript()]}
            onChange={handleChange}
            placeholder={`编写你的代码，使用javascript`}
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
      </Drawer>
    </NodePortal>
  );
};

export const CodeNode = memo(CodeNodeComponent);
