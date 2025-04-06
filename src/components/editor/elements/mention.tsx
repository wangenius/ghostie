import { AgentStore } from "@/agent/Agent";
import { AgentProps } from "@/agent/types/agent";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Editor, Node, Transforms } from "slate";
import { useFocused, useSelected } from "slate-react";

/**
 * 为编辑器添加提(mention)功能的高阶组件
 * @param editor Slate��器实
 * @returns 例
 */
export const withMentions = (editor: Editor) => {
  const { isInline, isVoid, markableVoid, insertText } = editor;

  // 改写 insertText 方法，确保在合适的位置移除 optimise 标记
  editor.insertText = (text) => {
    const marks = Editor.marks(editor) as Omit<CustomText, "text">;
    if (marks?.optimise) {
      const { selection } = editor;

      if (selection) {
        const [node] = Editor.node(editor, selection);

        // 获取当前节点的文本内容
        const nodeText = Node.string(node);

        // 如果光标在文本开始或结束位置，移除标记
        if (
          selection.anchor.offset === 0 ||
          selection.anchor.offset === nodeText.length
        ) {
          Editor.removeMark(editor, "optimise");
        }
      }
    }
    insertText(text);
  };

  // 改写 isInline 方法,使 mention 元素作为行内元素渲染
  editor.isInline = (element: CustomElement) => {
    return element.type === "mention" ? true : isInline(element);
  };

  // 改写 isVoid 方法,使 mention 元素作为空元素渲染
  editor.isVoid = (element: CustomElement) => {
    return element.type === "mention" ? true : isVoid(element);
  };

  // 改写 markableVoid 方法,允许 mention 元素可标记
  editor.markableVoid = (element: CustomElement) => {
    return element.type === "mention" || markableVoid(element);
  };

  return editor;
};

export const insertMention = (editor: any, character: AgentProps) => {
  const mention: MentionElement = {
    type: "mention",
    id: character.id,
    children: [{ text: character.name }],
  };
  Transforms.insertNodes(editor, mention);
  Transforms.move(editor);
};
export const Mention = ({
  attributes,
  children,
  element,
}: {
  attributes: any;
  children: any;
  element: MentionElement;
}) => {
  const select = useSelected();
  const focus = useFocused();
  const [open, setOpen] = useState(false);

  const agent = AgentStore.use((state) => state[element.id]);

  return (
    <DropdownMenu
      onOpenChange={(v) => {
        setOpen(v);
      }}
    >
      <DropdownMenuTrigger asChild>
        <span
          className={cn(
            "bg-muted-foreground/10 px-2 py-0.5 rounded-full text-xs mx-1",
            select && focus && "bg-muted-foreground/20",
            open && "border-solid",
          )}
          {...attributes}
          contentEditable={false}
          data-id={element.id}
        >
          {element.children[0].text}
          {children}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={"bottom"} align={"start"} className="w-44">
        <DropdownMenuItem>{agent.id}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
