import { Positioner } from "@/components/editor/position";
import { Menu } from "@/components/ui/menu";
import { useCallback, useEffect, useRef, useState } from "react";
import { TbFile, TbPhoto } from "react-icons/tb";
import { Editor, Range } from "slate";
import { useSlate } from "slate-react";
import { Portal } from ".";

export type Tool = {
  label?: string;
  icon?: React.ElementType;
  onClick?: () => void;
  type?: "item" | "separate" | "label";
};

/**
 * 菜单
 * */
export const HashDrop = () => {
  const editor = useSlate();
  const [toolRange, setToolRange] = useState<Range | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [searchText, setSearchText] = useState("");

  const position = Positioner.range(editor, toolRange, menuRef);
  const tools: Tool[] = [
    {
      label: "插入文件",
      icon: TbFile,
      onClick: () => {
        if (!toolRange) return;
      },
    },
    {
      label: "插入图片",
      icon: TbPhoto,
      onClick: async () => {
        if (!toolRange) return;
      },
    },
  ];
  const filterTools = tools.filter((m) =>
    m.label?.toLowerCase().includes(searchText.toLowerCase()),
  );

  useEffect(() => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);
      const before = Editor.before(editor, start, { unit: "character" });

      if (before) {
        const range = Editor.range(editor, before, start);
        const text = Editor.string(editor, range);
        if (text === "#" || text === "/" || text === "、") {
          setToolRange(range);
          setSearchText("");
          setFocusIndex(0);
          return;
        }
      }

      const wordBefore = Editor.before(editor, start, { unit: "word" });
      const f = wordBefore && Editor.before(editor, wordBefore);
      if (f) {
        const beforeRange = Editor.range(editor, f, start);
        const beforeText = Editor.string(editor, beforeRange);
        const match = beforeText && beforeText.match(/^#([\u4e00-\u9fa5\w]*)$/);

        if (match) {
          setToolRange(beforeRange);
          setSearchText(match[1]);
          setFocusIndex(0);
          return;
        }
      }
    }

    setToolRange(null);
  }, [editor.selection]);

  useEffect(() => {
    if (toolRange && menuRef.current) {
      const position = Positioner.range(editor, toolRange, menuRef);
      if (position) {
        Object.assign(menuRef.current.style, position);
      }
    }
  }, [toolRange, filterTools.length, position]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!toolRange || filterTools.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusIndex((i) => (i + 1) % filterTools.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusIndex(
            (i) => (i - 1 + filterTools.length) % filterTools.length,
          );
          break;
        case "Enter":
        case "Tab":
          event.preventDefault();
          filterTools[focusIndex].onClick?.();
          setToolRange(null);
          break;
        case "Escape":
          event.preventDefault();
          setToolRange(null);
          break;
      }
    },
    [editor, toolRange, filterTools, focusIndex],
  );

  useEffect(() => {
    if (toolRange) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return;
  }, [handleKeyDown, toolRange]);

  if (!toolRange || filterTools.length === 0) return null;

  return (
    <Portal>
      <div
        ref={menuRef}
        className="z-[1000] absolute top-[-999999px] left-[-99999px] flex"
      >
        <Menu
          focusIndex={focusIndex}
          items={filterTools.map((tool) => ({
            label: tool.label,
            icon: tool.icon,
            onClick: () => {
              tool.onClick?.();
              setToolRange(null);
            },
          }))}
        ></Menu>
      </div>
    </Portal>
  );
};
