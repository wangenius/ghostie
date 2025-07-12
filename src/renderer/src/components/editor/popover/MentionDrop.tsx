import { Menu, MenuItemProps } from "@/components/ui/menu";

import { Positioner } from "@/components/editor/position";
import { useCallback, useEffect, useRef, useState } from "react";
import { TbGhost3 } from "react-icons/tb";
import { Editor, Range, Transforms } from "slate";
import { useSlate } from "slate-react";
import { Portal } from ".";
import { insertMention } from "../elements/mention";

interface Mention {
  name: string;
  id: string;
}

/** 目标提及下拉菜单 */
export const MentionDrop = ({ mentions }: { mentions: Mention[] }) => {
  const editor = useSlate();
  const [actantRange, setActantRange] = useState<Range | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const [searchText, setSearchText] = useState("");
  const menuRef = useRef<HTMLDivElement | null>(null);
  const position = Positioner.range(editor, actantRange, menuRef);

  useEffect(() => {
    const { selection } = editor;
    if (selection && Range.isCollapsed(selection)) {
      const [start] = Range.edges(selection);

      // Check for @ trigger
      const letterBefore = Editor.before(editor, start, { unit: "character" });
      if (letterBefore) {
        const range = Editor.range(editor, letterBefore, start);
        const text = Editor.string(editor, range);

        if (text === "@") {
          setActantRange(range);
          setSearchText("");
          setFocusIndex(0);
          return;
        }
      }

      // Check for search text
      const wordBefore = Editor.before(editor, start, { unit: "word" });
      const before = wordBefore && Editor.before(editor, wordBefore);
      if (before) {
        const beforeRange = Editor.range(editor, before, start);
        const beforeText = Editor.string(editor, beforeRange);
        const match = beforeText && beforeText.match(/^@([\u4e00-\u9fa5\w]*)$/);

        if (match) {
          setActantRange(beforeRange);
          setSearchText(match[1]);
          setFocusIndex(0);
          return;
        }
      }
    }

    setActantRange(null);
  }, [editor.selection]);

  useEffect(() => {
    if (actantRange && mentions.length > 0 && menuRef.current) {
      const position = Positioner.range(editor, actantRange, menuRef);
      if (position) {
        Object.assign(menuRef.current.style, position);
      }
    }
  }, [actantRange, mentions.length, position]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!actantRange || mentions.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setFocusIndex((i) => (i + 1) % mentions.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setFocusIndex((i) => (i - 1 + mentions.length) % mentions.length);
          break;
        case "Enter":
        case "Tab":
          event.preventDefault();
          Transforms.select(editor, actantRange);
          insertMention(editor, mentions[focusIndex]);
          Transforms.insertText(editor, "");
          setActantRange(null);
          break;
        case "Escape":
          event.preventDefault();
          setActantRange(null);
          break;
      }
    },
    [editor, actantRange, mentions, focusIndex],
  );

  useEffect(() => {
    if (actantRange) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
    return;
  }, [handleKeyDown, actantRange]);

  if (!actantRange || mentions.length === 0) return null;

  return (
    <Portal>
      <div
        ref={menuRef}
        className="z-[1000] absolute top-[-999999px] left-[-99999px] rounded-2xl flex"
      >
        <Menu
          items={[
            ...mentions.map((mention, i) => {
              return {
                label: mention.name,
                icon: TbGhost3,
                onClick: () => {
                  Transforms.select(editor, actantRange);
                  insertMention(editor, mention);
                  Transforms.insertText(editor, "");
                  setActantRange(null);
                },
                active: i === focusIndex,
              } as MenuItemProps;
            }),
          ]}
        />
      </div>
    </Portal>
  );
};
