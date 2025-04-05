import { cn } from "@/lib/utils";
import React, {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from "react";
import { createEditor, Descendant } from "slate";
import { withHistory } from "slate-history";
import { Editable, ReactEditor, Slate, withReact } from "slate-react";
import { Element, Leaf } from "./elements";
import { withMentions } from "./elements/mention";

interface SlateEditorProps {
  value: Descendant[];

  onChange(value: Descendant[]): void;

  extensions?: ReactNode[];
  readonly?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  className?: string;
  quickFocus?: boolean;
}

const renderElement = (props: any) => <Element {...props} />;
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
    () => withMentions(withReact(withHistory(createEditor()))),
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

  // 优化只读模式下的滚动
  useEffect(() => {
    if (readonly && refs.bottom.current) {
      refs.bottom.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [readonly]);

  // 优化键盘事件处理
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "w") {
        event.preventDefault();
      }
      if (readonly) return;
    },
    [editor, readonly],
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        props.quickFocus &&
        event.ctrlKey &&
        event.key.toLowerCase() === "i"
      ) {
        event.preventDefault();
        ReactEditor.focus(editor);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [props.quickFocus]);

  return (
    <div className={cn("flex-1", className)} ref={refs.root}>
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
          className="text-xs overflow-x-hidden h-full border-none outline-none"
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          onKeyDown={onKeyDown}
          placeholder={placeholder || "[#]呼出快捷面板，[@]快速调用角色"}
        />
        <div ref={refs.bottom} />
        {extensions}
      </Slate>
    </div>
  );
});

SlateEditor.displayName = "SlateEditor";
