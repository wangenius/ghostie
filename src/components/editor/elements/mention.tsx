import { AgentInfos } from "@/agent/types/agent";
import { cn } from "@/lib/utils";
import { TbGhost3 } from "react-icons/tb";
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

export const insertMention = (editor: any, character: AgentInfos) => {
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

  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        fontSize: "12px",
      }}
      className={cn(
        "inline-flex items-center translate-y-0.5 py-1 bg-muted px-2 rounded-md text-xs m-0 mx-1",
        select && focus && "bg-muted-foreground/20 ring-1 ring-primary",
      )}
      data-id={element.id}
    >
      <TbGhost3 size={14} className="mr-1 select-none" />
      <span className="max-w-[300px] truncate select-none">
        {element.children[0].text}
      </span>
      {children}
    </span>
  );
};
