import { Descendant } from "slate";

export const plainText = (value: Descendant[]) =>
  value
    .map((node) => {
      // 处理普通文本节点
      if (!("type" in node)) {
        return node.text;
      }

      // 处理包含子节点的节点
      if ("children" in node) {
        return node.children
          .map((child) => {
            if (child.type === "file") {
              return `[file](${child.path})`;
            }
            if (child.type === "mention") {
              return "";
            }
            if (child.type === "image") {
              return "";
            }
            return "text" in child ? child.text : "";
          })
          .join("");
      }

      return "";
    })
    .join("")
    .trim();
