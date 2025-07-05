import { HashDrop } from "@/components/editor/popover/HashDrop";
import { MentionDrop } from "@/components/editor/popover/MentionDrop";
import { SlateEditor } from "@/components/editor/SlateEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { TbCornerRightUp, TbLoader } from "react-icons/tb";
import { Descendant } from "slate";
export const plainText = (value: Descendant[]) =>
  value
    .map((node) => {
      // 处理普通文本节点
      if (!("type" in node)) {
        return node.text;
      }

      // 处理包含子节点的节点
      if ("children" in node) {
        return node.children
          .map((child) => {
            if (child.type === "file") {
              return `[file](${child.path})`;
            }
            if (child.type === "mention") {
              return "";
            }
            if (child.type === "image") {
              return "";
            }
            return "text" in child ? child.text : "";
          })
          .join("");
      }

      return "";
    })
    .join("")
    .trim();

export const TypeArea = memo(
  (props: {
    onSubmit: (value: Descendant[]) => void;
    className?: string;
    value: Descendant[];
    onChange: (value: Descendant[]) => void;
    editorRef?: React.RefObject<{ focus: () => void }>;
    EnterButton?: React.ReactNode;
    currentAgent?: string;
    loading?: boolean;
  }) => {
    return (
      <div className="flex flex-col relative h-[120px] border rounded-2xl">
        <div
          className={cn(
            "flex flex-1 flex-col relative overflow-y-auto px-3 py-2",
          )}
        >
          <SlateEditor
            value={props.value}
            onChange={props.onChange}
            onSubmit={props.onSubmit}
            quickFocus={true}
            editorRef={props.editorRef}
            placeholder="use @ to call agent & ctrl + enter to send"
            extensions={[
              <HashDrop key="hash_drop_menu" />,
              <MentionDrop key="mention_at_drop_menu" />,
            ]}
          />
        </div>
        <div className="flex-none flex justify-end px-1 py-1">
          <Button
            onClick={() => props.onSubmit(props.value)}
            variant={props.loading ? "primary" : "ghost"}
            disabled={plainText(props.value).trim() === "" && !props.loading}
            className={cn(
              "no-drag rounded-full !h-6 pr-1",
              plainText(props.value).trim() === "" &&
                !props.loading &&
                "opacity-50 hover:bg-transparent cursor-default hover:opacity-50",
            )}
          >
            {props.loading ? "stop" : "OK"}
            {props.loading ? (
              <TbLoader className="w-4 h-4 animate-spin" />
            ) : (
              <TbCornerRightUp className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>
    );
  },
);
