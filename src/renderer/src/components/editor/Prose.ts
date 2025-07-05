import { Descendant, Node } from "slate";
import {
  ParagraphElement,
  CustomText,
  DEFAULT_DESCENDANT_ARRAY,
} from "./slate-types";

declare global {
  interface Array<T> {
    toText(): string;
    merge(text: string): Descendant[];
    isEmpty(): boolean;
  }
  interface String {
    toDescendant(): Descendant[];
    chunking(count: number): string[];
    download(name: string): void;
  }
}

/** 将字符串按字数分割成若干个字符串
 * 1. 如果字符串长度小于count，则返回整个字符串
 * 2. 如果字符串长度大于count，则返回分割后的字符串数组
 * 3. 如果字符串长度等于count，则返回整个字符串
 */
String.prototype.chunking = function (this: string, count: number) {
  if (this.length <= count) return [this];
  /* 分割字符串, 这个count很大的，不用正则 */
  const result = [];
  for (let i = 0; i < this.length; i += count) {
    result.push(this.slice(i, i + count));
  }
  return result;
};

// 扩展 String 类型
String.prototype.toDescendant = function (this: string) {
  return Prose.sharpen(this);
};

// 扩展 Descendant[] 类型
(Array.prototype as Descendant[]).toText = function (this: Descendant[]) {
  return Prose.flatten(this);
};

(Array.prototype as Descendant[]).merge = function (
  this: Descendant[],
  text: string,
) {
  return Prose.descendantAppend(this, text);
};

(Array.prototype as Descendant[]).isEmpty = function (this: Descendant[]) {
  if (!this || this.length === 0) return true;
  return this.every((node) => {
    const text = Node.string(node);
    return !text || text.trim() === "";
  });
};

export const Prose = {
  /**
   * 将给定的编辑器内容平铺为一个字符串
   * 此函数的目的是将复杂的编辑器内容结构转换为单一的文本字符串表示
   * @param editor 编辑器内容，可能是一个包含子元素的数组，也可能未定义或为null
   * @returns 返回平铺后的字符串，如果没有编辑器内容则返回空字符串
   *
   * @example
   *
   * ```typescript
   *
   * const editorContent = [{ : "paragraph", children: [{ text: "Hello" }]}]
   * const result = flatten(editorContent)
   *
   * console.log(result)
   * ```
   * ```console
   * 输出: Hello
   * ```
   *
   */
  flatten(editor?: Descendant[] | null): string {
    if (!editor || !Array.isArray(editor)) return "";
    return editor.map((item) => Node.string(item)).join("\n") + "\n";
  },

  /**
   * 提取出编辑器中的主要段落，即不包含标题、链接、代码块等元素的段落
   * @param body 编辑器内容，可能是一个包含子元素的数组，也可能未定义或为null
   * @returns 返回提取出的主要段落，如果没有编辑器内容则返回空字符串
   */
  extract(body?: Descendant[] | null): string {
    if (!body?.length) return "";

    return (
      body
        .filter((item) => (item as ParagraphElement).type === "paragraph")
        .map((item) => Node.string(item))
        .join("\n") + "\n"
    );
  },

  /**
   * 将文本转换为Descendant数组
   * @param text 文本内容
   * @returns 返回转换后的Descendant数组
   *
   * @example
   * ```typescript
   * const result = helper.sharpen("Hello\nWorld")
   * console.log(result)
   * ```
   *
   * ```console
   * 输出: [{"":"paragraph","children":[{"text":"Hello"}]},{"":"paragraph","children":[{"text":"World"}]}]
   * ```
   *
   * */
  sharpen(text: string): Descendant[] {
    if (!text) return DEFAULT_CONTENT;

    return text
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => ({
        type: "paragraph" as const,
        children: [{ text: line.trimStart() }],
      }));
  },

  /**
   * 为Descendant数组追加文本
   */
  descendantAppend(
    descendant: Descendant[] | null | undefined,
    text: string,
  ): Descendant[] {
    if (!text) return descendant || DEFAULT_DESCENDANT_ARRAY;

    const paragraphs = [...(descendant || DEFAULT_DESCENDANT_ARRAY)];
    if (!paragraphs.length) return DEFAULT_DESCENDANT_ARRAY;

    // 获取最后一个段落
    const lastParagraph = paragraphs[paragraphs.length - 1] as ParagraphElement;
    const existingText = (lastParagraph.children[0] as CustomText).text || "";

    // 分割新文本并过滤掉空行
    const segments = text.replaceAll("\n\n", "\n").split("\n");

    // 更新最后一个段落，将第一段新文本追加到现有文本
    if (segments[0]) {
      paragraphs[paragraphs.length - 1] = {
        type: "paragraph",
        children: [{ text: existingText + segments[0] }],
      };
    }

    // 为剩余的非空段落创建新的段落元素
    const newParagraphs: ParagraphElement[] = segments
      .slice(1)
      .map((segment: string) => ({
        type: "paragraph",
        children: [{ text: segment }],
      }));

    // 返回合并后的数组
    return [...paragraphs, ...newParagraphs];
  },
};

export const DEFAULT_CONTENT: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  },
];
