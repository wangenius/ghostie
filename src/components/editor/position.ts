import { Editor, Range, Text } from 'slate';
import { ReactEditor } from 'slate-react';

interface Position {
  top: string;
  left: string;
}

export class Positioner {
  private static readonly PANEL_WIDTH = 380; // 面板宽度
  private static readonly PANEL_MARGIN = 8; // 与屏幕边缘的最小间距

  private constructor() {}

  private static calculatePosition(
    rect: DOMRect,
    panelHeight: number,
    viewportWidth: number,
    viewportHeight: number,
    preferBottom: boolean = true
  ): Position {
    let top = preferBottom
      ? rect.top + window.scrollY + 24 // 下方显示
      : rect.top + window.scrollY - panelHeight - 8; // 上方显示
    let left = rect.left + window.scrollX;

    // 调整水平位置
    if (left + this.PANEL_WIDTH + this.PANEL_MARGIN > viewportWidth) {
      left = viewportWidth - this.PANEL_WIDTH - this.PANEL_MARGIN;
    }
    left = Math.max(this.PANEL_MARGIN, left);

    // 如果是下方显示且超出底部,尝试上方显示
    if (preferBottom && top + panelHeight > viewportHeight + window.scrollY) {
      top = rect.top + window.scrollY - panelHeight - 8;
    }

    // 如果是上方显示且超出顶部,放回下方显示
    if (!preferBottom && top < window.scrollY + this.PANEL_MARGIN) {
      top = Math.min(
        rect.top + window.scrollY + 24,
        viewportHeight + window.scrollY - panelHeight - this.PANEL_MARGIN
      );
    }

    // 确保不会超出顶部
    top = Math.max(this.PANEL_MARGIN + window.scrollY, top);

    return {
      top: `${top}px`,
      left: `${left}px`,
    };
  }

  static range(
    editor: Editor,
    range: Range | null,
    panelRef: React.RefObject<HTMLDivElement>
  ): Position | null {
    if (!range || !editor || !panelRef.current) return null;

    try {
      const domRange = ReactEditor.toDOMRange(editor, range);
      const rect = domRange.getBoundingClientRect();

      return this.calculatePosition(
        rect,
        panelRef.current.offsetHeight,
        window.innerWidth,
        window.innerHeight
      );
    } catch (error) {
      console.warn('Error in calculatePosition:', error);
      return null;
    }
  }

  static optimise(
    editor: Editor,
    optimiseId: string | null,
    panelRef: React.RefObject<HTMLDivElement>
  ): Position | null {
    if (!optimiseId || !editor || !panelRef.current) return null;

    try {
      const nodes = Array.from(
        Editor.nodes(editor, {
          at: [],
          match: n => Text.isText(n) && (n as any).optimise === optimiseId,
        })
      );

      if (!nodes || nodes.length === 0) return null;

      const panelHeight = panelRef.current.offsetHeight;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // 先尝试使用最后一个节点在下方显示
      const lastNode = nodes[nodes.length - 1];
      if (!lastNode) return null;

      const lastRange = {
        anchor: { path: lastNode[1], offset: 0 },
        focus: {
          path: lastNode[1],
          offset: (lastNode[0] as any).text?.length || 0,
        },
      };

      const lastDomRange = ReactEditor.toDOMRange(editor, lastRange);
      const lastRect = lastDomRange.getBoundingClientRect();

      // 先尝试在最后一个节点下方显示
      const lastPosition = this.calculatePosition(
        lastRect,
        panelHeight,
        viewportWidth,
        viewportHeight,
        true
      );

      // 如果最后节点下方显示会超出底部,尝试使用第一个节点在上方显示
      if (
        parseFloat(lastPosition.top) + panelHeight >
        viewportHeight + window.scrollY
      ) {
        const firstNode = nodes[0];
        if (!firstNode) return null;

        const firstRange = {
          anchor: { path: firstNode[1], offset: 0 },
          focus: {
            path: firstNode[1],
            offset: (firstNode[0] as any).text?.length || 0,
          },
        };

        const firstDomRange = ReactEditor.toDOMRange(editor, firstRange);
        const firstRect = firstDomRange.getBoundingClientRect();

        return this.calculatePosition(
          firstRect,
          panelHeight,
          viewportWidth,
          viewportHeight,
          false
        );
      }

      return lastPosition;
    } catch (error) {
      console.warn('Error in calculatePosition:', error);
      return null;
    }
  }
}
