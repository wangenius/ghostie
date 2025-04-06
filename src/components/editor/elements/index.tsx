import { cn } from "@/lib/utils";
import { Node } from "slate";
import { useFocused, useSelected } from "slate-react";
import { Mention } from "./mention";

export const Leaf = ({ attributes, children, leaf }: any) => {
  if (leaf.bold) {
    children = <strong className="font-medium">{children}</strong>;
  }

  if (leaf.code) {
    children = <code>{children}</code>;
  }

  if (leaf.italic) {
    children = <em>{children}</em>;
  }

  if (leaf.underline) {
    children = <u>{children}</u>;
  }

  return <span {...attributes}>{children}</span>;
};
export const Element = (props: any) => {
  const { attributes, children, element } = props;
  const isEmpty = Node.string(element).trim() === "";
  const isFocused = useFocused();
  const isSelected = useSelected();

  switch (element.type) {
    case "mention":
      return (
        <Mention
          attributes={attributes}
          {...props}
          element={element as MentionElement}
        >
          {children}
        </Mention>
      );
    default:
      return (
        <p
          className={cn(
            "text-muted-foreground rounded-lg text-[15px]",
            isEmpty && isFocused && isSelected && "placeholder-p",
          )}
          {...attributes}
        >
          {children}
        </p>
      );
  }
};
