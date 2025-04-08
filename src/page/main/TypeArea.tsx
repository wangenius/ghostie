import { HashDrop } from "@/components/editor/popover/HashDrop";
import { MentionDrop } from "@/components/editor/popover/MentionDrop";
import { SlateEditor } from "@/components/editor/SlateEditor";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { Descendant } from "slate";
import { plainText } from "./MainView";
import { TbCornerRightUp, TbLoader } from "react-icons/tb";

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
      <div className="flex flex-col relative h-full max-h-[160px]">
        <div
          className={cn("flex flex-1 flex-col relative overflow-y-auto px-3", {
            "bg-background border-t border-border pt-3": !!props.currentAgent,
          })}
        >
          <SlateEditor
            value={props.value}
            onChange={props.onChange}
            onSubmit={props.onSubmit}
            quickFocus={true}
            editorRef={props.editorRef}
            placeholder="use @ to call agent, use / to call resources and ctrl + enter to send"
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
              "no-drag rounded-[8px]",
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
