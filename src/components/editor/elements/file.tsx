import { cn } from "@/lib/utils";
import { TbFile } from "react-icons/tb";
import { Editor, Transforms } from "slate";
import { useFocused, useSelected } from "slate-react";

/**
 * 为编辑器添加文件功能的高阶组件
 * @param editor Slate编辑器实例
 * @returns 编辑器实例
 */
export const withFiles = (editor: Editor) => {
  const { isInline, isVoid, markableVoid } = editor;

  // 改写 isInline 方法，使 file 元素作为行内元素渲染
  editor.isInline = (element: CustomElement) => {
    return element.type === "file" ? true : isInline(element);
  };

  // 改写 isVoid 方法，使 file 元素作为空元素渲染
  editor.isVoid = (element: CustomElement) => {
    return element.type === "file" ? true : isVoid(element);
  };

  // 改写 markableVoid 方法，允许 file 元素可标记
  editor.markableVoid = (element: CustomElement) => {
    return element.type === "file" || markableVoid(element);
  };

  return editor;
};

export const insertFile = (editor: any, filePath: string) => {
  // 从路径中提取文件名
  const fileName = filePath.split(/[/\\]/).pop() || filePath;

  const file: FileElement = {
    type: "file",
    path: filePath,
    name: fileName,
    children: [{ text: "" }],
  };

  Transforms.insertNodes(editor, file);
  Transforms.move(editor);
};

export const File = ({
  attributes,
  children,
  element,
}: {
  attributes: any;
  children: any;
  element: FileElement;
}) => {
  const selected = useSelected();
  const focused = useFocused();

  return (
    <span
      {...attributes}
      contentEditable={false}
      style={{
        fontSize: "12px",
      }}
      className={cn(
        "inline-flex items-center translate-y-0.5 py-1 bg-muted-foreground text-muted px-2 rounded-md text-xs m-0 mx-1",
        selected && focused && "bg-muted-foreground/80 ring-1 ring-primary",
      )}
      data-file-path={element.path}
    >
      <TbFile size={14} className="mr-1 select-none" />
      <span className="max-w-[300px] truncate select-none">{element.name}</span>
      {children}
    </span>
  );
};
