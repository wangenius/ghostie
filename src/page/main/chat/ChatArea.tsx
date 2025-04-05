import { HashDrop } from "@/components/editor/popover/HashDrop";
import { MentionDrop } from "@/components/editor/popover/MentionDrop";
import { SlateEditor } from "@/components/editor/SlateEditor";
import { memo, useState } from "react";
import { Descendant } from "slate";

export const TypeArea = memo(() => {
  const [value, setValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [
        {
          text: "",
        },
      ],
    },
  ]);
  return (
    <div className="flex flex-1 flex-col h-full p-3 relative overflow-y-auto">
      <SlateEditor
        value={value}
        onChange={setValue}
        extensions={[
          <HashDrop key="hash_drop_menu" />,
          <MentionDrop key="mention_at_drop_menu" />,
        ]}
      />
    </div>
  );
});
