import { BaseEditor, BaseRange, Descendant, Element, Range } from 'slate';
import { HistoryEditor } from 'slate-history';
import { ReactEditor } from 'slate-react';

/*
 * 关于slate的类型定义
 * 参考：https://docs.slatejs.org/concepts/02-nodes
 * Transforms 用来修改Slate的值
 */
/**默认的章节内容*/
export const DEFAULT_DESCENDANT_ARRAY: Descendant[] = [
  { type: 'paragraph', children: [{ text: '' }] },
];
declare global {
  // 定义自定义编辑器类型
  type CustomEditor = BaseEditor &
    ReactEditor &
    HistoryEditor & {
      nodeToDecorations?: Map<Element, Range[]>;
    };

  // 基础文本类型定义
  type CustomText = {
    type?: 'text';
    bold?: boolean;
    italic?: boolean;
    code?: boolean;
    underline?: boolean;
    text: string;
    optimise?: string;
  };

  type EmptyText = {
    type?: 'text';
    text: string;
  };

  // 表格相关类型
  type TableCell = {
    type: 'table-cell';
    children: CustomText[];
  };

  type TableRow = {
    type: 'table-row';
    children: TableCell[];
  };

  // 所有元素类型定义
  type BlockQuoteElement = {
    type: 'block-quote';
    align?: string;
    children: Descendant[];
  };

  type BulletedListElement = {
    type: 'bulleted-list';
    align?: string;
    children: Descendant[];
  };

  type CheckListItemElement = {
    type: 'check-list-item';
    checked: boolean;
    children: Descendant[];
  };

  type EditableVoidElement = {
    type: 'editable-void';
    children: EmptyText[];
  };

  type HeadingElement = {
    type: 'heading';
    align?: string;
    children: Descendant[];
  };

  type HeadingTwoElement = {
    type: 'heading-two';
    align?: string;
    children: Descendant[];
  };

  type ImageElement = {
    type: 'image';
    url: string;
    children: EmptyText[];
  };

  type LinkElement = {
    type: 'link';
    url: string;
    children: Descendant[];
  };

  type ButtonElement = {
    type: 'button';
    children: Descendant[];
  };

  type BadgeElement = {
    type: 'badge';
    children: Descendant[];
  };

  type ListItemElement = {
    type: 'list-item';
    children: Descendant[];
  };

  type MentionElement = {
    type: 'mention';
    id: string;
    children: CustomText[];
  };

  type PredictElement = {
    type: 'deduce';
    id: string;
    children: CustomText[];
  };

  type AnswerNodeElement = {
    type: 'answer';
    id: string;
    loading: boolean;
    children: CustomText[];
  };

  type InlineAIDialogElement = {
    type: 'dialog';
    id: string;
    children: CustomText[];
  };

  type ParagraphElement = {
    type: 'paragraph';
    align?: string;
    children: Descendant[];
  };

  type TableElement = {
    type: 'table';
    children: TableRow[];
  };

  type TableCellElement = TableCell;

  type TableRowElement = TableRow;

  type TitleElement = {
    type: 'title';
    children: Descendant[];
  };

  type VideoElement = {
    type: 'video';
    url: string;
    children: EmptyText[];
  };

  type CodeBlockElement = {
    type: 'code-block';
    language: string;
    children: Descendant[];
  };

  type CodeLineElement = {
    type: 'code-line';
    children: Descendant[];
  };

  // CustomElement 联合类型
  type CustomElement =
    | BlockQuoteElement
    | BulletedListElement
    | CheckListItemElement
    | EditableVoidElement
    | HeadingElement
    | HeadingTwoElement
    | ImageElement
    | LinkElement
    | ButtonElement
    | BadgeElement
    | ListItemElement
    | MentionElement
    | AnswerNodeElement
    | PredictElement
    | InlineAIDialogElement
    | ParagraphElement
    | TableElement
    | TableRowElement
    | TableCellElement
    | TitleElement
    | VideoElement
    | CodeBlockElement
    | CodeLineElement;
}

declare module 'slate' {
  interface CustomTypes {
    Editor: CustomEditor;
    Element: CustomElement;
    Text: CustomText | EmptyText;
    Range: BaseRange & {
      [key: string]: unknown;
    };
  }
}

// 导出所有类型
export type {
  CustomEditor,
  CustomElement,
  CustomText,
  EmptyText,
  TableCell,
  TableRow,
  BlockQuoteElement,
  BulletedListElement,
  CheckListItemElement,
  EditableVoidElement,
  HeadingElement,
  HeadingTwoElement,
  ImageElement,
  LinkElement,
  ButtonElement,
  BadgeElement,
  ListItemElement,
  MentionElement,
  AnswerNodeElement,
  PredictElement,
  InlineAIDialogElement,
  ParagraphElement,
  TableElement,
  TableCellElement,
  TableRowElement,
  TitleElement,
  VideoElement,
  CodeBlockElement,
  CodeLineElement,
};
