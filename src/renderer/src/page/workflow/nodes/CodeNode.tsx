import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { javascript } from "@codemirror/lang-javascript";
import { tags as t } from "@lezer/highlight";
import { githubDarkInit } from "@uiw/codemirror-theme-github";
import CodeMirror from "@uiw/react-codemirror";
import { memo, useCallback, useState } from "react";
import { NodeProps } from "reactflow";
import { useFlow } from "../context/FlowContext";
import { NodeExecutor } from "../../../workflow/execute/NodeExecutor";
import { CodeNodeConfig, NodeState, WorkflowNode } from "../types/nodes";
import { NodePortal } from "./NodePortal";

const CodeNodeComponent = (props: NodeProps<CodeNodeConfig>) => {
  const [open, setOpen] = useState(false);
  const { updateNodeData } = useFlow();
  const handleChange = useCallback(
    (value: string) => {
      updateNodeData<CodeNodeConfig>(props.id, { code: value });
    },
    [updateNodeData, props.id],
  );
  return (
    <NodePortal {...props} left={1} right={1} variant="code" title="Code">
      <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg">
        <p className="text-xs text-muted-foreground">
          Unlike [Plugins], code nodes do not support local operations. Code
          nodes are used to perform data processing operations, filtering,
          sorting, etc.
        </p>
      </div>
      <Button
        className="bg-muted-foreground/10 hover:bg-muted-foreground/20 h-8"
        onClick={() => setOpen(true)}
      >
        Edit Code
      </Button>

      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Edit Code"
        className="w-[600px]"
        description={
          <div className="flex-none bg-muted-foreground/10 p-3 rounded-lg mx-3">
            <p className="text-xs text-muted-foreground">
              Use inputs as input.
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
            placeholder={`Write your code, use javascript`}
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
export class CodeNodeExecutor extends NodeExecutor {
  constructor(
    node: WorkflowNode,
    updateNodeState: (update: Partial<NodeState>) => void,
  ) {
    super(node, updateNodeState);
  }

  public override async execute(inputs: Record<string, any>) {
    try {
      this.updateNodeState({
        status: "running",
        startTime: new Date().toISOString(),
        inputs,
      });

      const codeConfig = this.node.data as CodeNodeConfig;
      if (!codeConfig.code) {
        throw new Error("Code content is empty");
      }

      const context = {
        inputs: inputs || {},
        console: {
          log: (...args: any[]) => console.log(...args),
          error: (...args: any[]) => console.error(...args),
        },
      };

      const functionBody = `
        "use strict";
        const {inputs, console} = arguments[0];
        ${codeConfig.code}
      `;

      const executeFn = new Function(functionBody);
      const result = await executeFn(context);

      this.updateNodeState({
        status: "completed",
        outputs: {
          result: result,
        },
      });

      return {
        success: true,
        data: {
          result: result,
        },
      };
    } catch (error) {
      return this.createErrorResult(error);
    }
  }
}

NodeExecutor.register("code", CodeNodeExecutor);
