import { HashDrop } from "@/components/editor/popover/HashDrop";
import { MentionDrop } from "@/components/editor/popover/MentionDrop";
import { SlateEditor } from "@/components/editor/SlateEditor";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { Descendant } from "slate";

export const TypeArea = memo(
  (props: {
    onSubmit: (value: Descendant[]) => void;
    className?: string;
    value: Descendant[];
    onChange: (value: Descendant[]) => void;
  }) => {
    return (
      <div
        className={cn(
          "flex flex-1 flex-col h-full max-h-[140px] px-3 relative overflow-y-auto",
          props.className,
        )}
      >
        <SlateEditor
          value={props.value}
          onChange={props.onChange}
          onSubmit={props.onSubmit}
          quickFocus={true}
          placeholder="use @ to call agent, use / to call resources and ctrl + enter to send"
          extensions={[
            <HashDrop key="hash_drop_menu" />,
            <MentionDrop key="mention_at_drop_menu" />,
          ]}
        />
      </div>
    );
  },
);
