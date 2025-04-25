import { cn } from "@/lib/utils";
import { cmd } from "@/utils/shell";
import React, {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { createEditor, Descendant, Editor, Transforms } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { Element, Leaf } from "./elements";
import { File, insertFile, withFiles } from "./elements/file";
import { Image } from "./elements/image";
import { withMentions } from "./elements/mention";
import { insertImage, withImages } from "./elements/withImages";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { toast } from "sonner";
interface SlateEditorProps {
  value: Descendant[];

  onChange(value: Descendant[]): void;

  extensions?: ReactNode[];
  readonly?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  quickFocus?: boolean;
  onSubmit?: (value: Descendant[]) => void;
  editorRef?: React.RefObject<{ focus: () => void }>;
}

const renderElement = (props: any) => {
  switch (props.element.type) {
    case "image":
      return <Image {...props} />;
    case "file":
      return <File {...props} />;
    default:
      return <Element {...props} />;
  }
};
const renderLeaf = (props: any) => <Leaf {...props} />;

/**
 * @description: 编辑器
 * @param defaultValue: Descendant[] 默认值
 * @param onChange: (value: Descendant[]) => void 值变化时的回调函数
 * @param extensions: ReactNode[] 插件
 * @param readonly: boolean 是否只读
 * */
export const SlateEditor = memo((props: SlateEditorProps) => {
  /** 编辑器实例记忆化 */
  const editor = useMemo(
    () =>
      withFiles(
        withImages(withMentions(withReact(withHistory(createEditor())))),
      ),
    [],
  );

  // 记忆化 props 解构
  const {
    extensions,
    readonly,
    value,
    onChange,
    autoFocus,
    placeholder,
    className,
    onSubmit,
    editorRef,
  } = props;

  // 优化底部 ref 的处理
  const refs = {
    bottom: useRef<HTMLDivElement>(null),
    root: useRef<HTMLDivElement>(null),
  };

  // 优化 value 变化的副作用
  useEffect(() => {
    if (JSON.stringify(editor.children) !== JSON.stringify(value)) {
      editor.children = value;
      editor.onChange();
    }
  }, [value, editor]);

  // 优化键盘事件处理
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.ctrlKey || event.shiftKey) && event.key === "Enter") {
        onSubmit?.(editor.children);
        event.preventDefault();
        // 提交后聚焦到编辑器末尾
        setTimeout(() => {
          const end = Editor.end(editor, []);
          Transforms.select(editor, end);
          ReactEditor.focus(editor);
        }, 0);
      }
    },
    [editor, readonly, onSubmit],
  );

  // 优化选择处理
  const handleSelect = useCallback(
    (event: any) => {
      if (!readonly) return;
      window.getSelection()?.removeAllRanges();
      event.preventDefault();
    },
    [readonly],
  );

  // 优化 Slate onChange 处理
  const handleSlateChange = useCallback(
    (newValue: Descendant[]) => {
      const isAstChange = editor.operations.some(
        (op: any) => "set_selection" !== op.type,
      );
      if (isAstChange) {
        onChange(newValue);
      }
    },
    [editor, onChange],
  );

  // 处理粘贴事件
  const handlePaste = useCallback(
    (event: React.ClipboardEvent) => {
      const items = event.clipboardData.items;
      console.log("🟢 粘贴事件", items);

      for (const item of items) {
        console.log("🟢 粘贴事件", item);
        if (item.type.startsWith("image/")) {
          event.preventDefault();
          const file = item.getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64String = e.target?.result as string;
              const base64Image = base64String.split(",")[1];
              insertImage(editor, {
                contentType: file.type,
                base64Image: base64Image,
              });
            };
            reader.readAsDataURL(file);
          }
        }
      }

      // 检查是否有文件（非图片）在剪贴板
      cmd
        .invoke<string[]>("get_file_drop_list")
        .then((files) => {
          if (files && files.length > 0) {
            event.preventDefault();
            // 将文件路径插入编辑器
            files.forEach((filePath) => {
              // 检查是否是图片文件
              const isImageFile = /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(
                filePath,
              );
              if (!isImageFile) {
                // 插入文件节点而不是纯文本
                insertFile(editor, filePath);
              }
            });
          }
        })
        .catch((error) => {
          console.error("获取剪贴板文件列表失败", error);
        });
    },
    [editor],
  );

  // 处理拖拽文件
  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    },
    [],
  );

  // 处理拖放文件
  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      // 处理拖拽的文件
      if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
        const files = Array.from(event.dataTransfer.files);
        console.log("🟢 拖拽文件", files);

        // 处理图片文件
        files.forEach((file) => {
          if (file.type.startsWith("image/")) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const base64String = e.target?.result as string;
              const base64Image = base64String.split(",")[1];
              insertImage(editor, {
                contentType: file.type,
                base64Image: base64Image,
              });
            };
            reader.readAsDataURL(file);
          }
          if (!file.type.startsWith("image/")) {
            insertFile(editor, file.name);
            toast.warning("非图片文件暂时不支持拖动，你可以复制后粘贴进来。");
          }
        });
      }
    },
    [editor],
  );

  useEffect(() => {
    getCurrentWebview().onDragDropEvent((event) => {
      console.log("🟢 拖拽事件", event);
      if (event.payload.type === "over") {
        console.log("User hovering", event.payload.position);
      } else if (event.payload.type === "drop") {
        console.log("User dropped", event.payload.paths);
      } else {
        console.log("File drop cancelled");
      }
    });
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        props.quickFocus &&
        event.ctrlKey &&
        event.key.toLowerCase() === "i"
      ) {
        event.preventDefault();
        // 聚焦到编辑器末尾
        const end = Editor.end(editor, []);
        Transforms.select(editor, end);
        ReactEditor.focus(editor);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.quickFocus, editor]);

  // 暴露聚焦方法
  useEffect(() => {
    if (editorRef?.current) {
      editorRef.current.focus = () => {
        setTimeout(() => {
          // 聚焦到编辑器末尾
          const end = Editor.end(editor, []);
          Transforms.select(editor, end);
          ReactEditor.focus(editor);
        }, 0);
      };
    }
  }, [editor, editorRef]);

  return (
    <div
      className={cn("flex-1", className)}
      ref={refs.root}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <Slate editor={editor} initialValue={value} onChange={handleSlateChange}>
        <Editable
          autoFocus={autoFocus}
          onSelect={handleSelect}
          readOnly={readonly}
          onMouseDown={readonly ? (e) => e.preventDefault() : undefined}
          onMouseUp={readonly ? (e) => e.preventDefault() : undefined}
          onClick={(event) => {
            if (readonly) event.preventDefault();
          }}
          className="text-sm overflow-x-hidden h-full border-none outline-none"
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
        />
        <div ref={refs.bottom} />
        {extensions}
      </Slate>
    </div>
  );
});

SlateEditor.displayName = "SlateEditor";
