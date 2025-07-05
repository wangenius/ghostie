import { Editor, Location, Point, Range } from 'slate';

export abstract class SlateTools {
  /** 获取当前光标前的指定长度的文本*/
  static getTextBeforeCursor(editor: Editor, length: number = 200): string {
    if (!editor.selection) return '';
    // 获取光标前 length 个字符的位置
    const startPoint: Point | undefined = Editor.before(
      editor,
      editor.selection,
      {
        unit: 'character',
        distance: length,
      }
    );
    // 如果起始点不存在，直接返回空字符串
    if (!startPoint) return '';
    // 获取从起始点到光标位置的文本范围
    const range: Range = { anchor: startPoint, focus: editor.selection.anchor };
    return Editor.string(editor, range);
  }

  static getAfter(editor: Editor, start: Location) {
    // 查找光标后的位置
    const after = Editor.after(editor, start);
    // 构建从光标位置到后面位置的选区
    const afterRange = Editor.range(editor, start, after);
    // 获取光标后面位置的文本内容
    const afterText = Editor.string(editor, afterRange);
    // 匹配文本内容是否为空格或行尾
    return afterText.match(/^(\s|$)/);
  }
}
