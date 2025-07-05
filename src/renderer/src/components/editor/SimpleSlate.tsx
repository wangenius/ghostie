import { createEditor, Descendant } from 'slate';
import { Editable, Slate, withReact } from 'slate-react';
import {
  memo,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { withHistory } from 'slate-history';
import { Leaf, Element } from '@/components/editor/elements';
import { DEFAULT_DESCENDANT_ARRAY } from './slate-types';
import { withMentions } from './elements/mention';

/** 一个SlateEditor的传值*/
interface SimpleSlateEditorProps {
  /** 是否只允许读*/
  readonly?: boolean;
  /** 默认value Descendant类型*/
  defaultValue: Descendant[];

  /** value更改时的函数: value是Descendant[]类型*/
  onChange(value: Descendant[]): void;

  /** 插件,使用useSlate的插件*/
  extensions?: ReactNode[];

  className?: string;
  /** 提示文字 */
  placeholder?: string;
}

/** 通用: Slate编辑器*/
export const SimpleSlate = memo((props: SimpleSlateEditorProps) => {
  /*编辑器*/
  const editor = useMemo(
    () => withMentions(withReact(withHistory(createEditor()))),
    []
  );
  /** 传值*/
  const { extensions, readonly, defaultValue, onChange } = props;

  /** 当前的slate编辑器的值*/
  const [value, setValue] = useState<Descendant[]>(defaultValue);

  const renderElement = useCallback((props: any) => <Element {...props} />, []);
  const renderLeaf = useCallback((props: any) => <Leaf {...props} />, []);

  useEffect(() => {
    editor.children = defaultValue;
    editor.onChange();
  }, [defaultValue, editor]);

  const rootRef = useRef<HTMLDivElement>(null);

  /**
   * 处理文档内容变化的回调函数
   * 主要用于处理提到功能的变化逻辑，识别是否为提到的触发情况，并在适当时候更新提到的搜索状态和目标选择
   * @param value 更新后的文档内容
   */
  const on_value_change = (value: Descendant[]) => {
    // 检查是否是AST（抽象语法树）的变化，即真正的文档内容变化
    const isAstChange = editor.operations.some(
      (op: any) => 'set_selection' !== op.type
    );
    if (isAstChange) {
      setValue(value);
      onChange(value);
    }
  };
  const on_key_press = useCallback(() => {
    return !!readonly;
  }, [editor]);
  return (
    <div ref={rootRef}>
      <Slate
        editor={editor}
        initialValue={value || DEFAULT_DESCENDANT_ARRAY}
        onChange={on_value_change}
      >
        <Editable
          className={props.className}
          onKeyDown={on_key_press}
          data-slate-simple="true"
          readOnly={readonly}
          onSelect={event => {
            if (readonly) event.preventDefault();
          }}
          onMouseDown={event => {
            if (readonly) event.preventDefault();
          }}
          onMouseUp={event => {
            if (readonly) event.preventDefault();
          }}
          onClick={event => {
            if (readonly) event.preventDefault();
          }}
          renderElement={renderElement}
          renderLeaf={renderLeaf}
          placeholder={props.placeholder}
        />
        {extensions?.map(item => item)}
      </Slate>
    </div>
  );
});

SimpleSlate.displayName = 'SimpleSlate';
