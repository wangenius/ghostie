import { cn } from "@/lib/utils";
import { useFocused, useSelected } from "slate-react";

export interface ImageElement {
  type: "image";
  contentType: string;
  base64Image: string;
  url: string;
  children: [{ text: string }];
}

export const Image = ({
  attributes,
  children,
  element,
}: {
  attributes: any;
  children: any;
  element: ImageElement;
}) => {
  const select = useSelected();
  const focus = useFocused();

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 bg-muted align-middle rounded-md px-2 mx-1",
        select && focus && "bg-primary/10",
      )}
      {...attributes}
      contentEditable={false}
      title="点击查看原图"
    >
      <img
        src={`data:${element.contentType};base64,${element.base64Image}`}
        alt=""
        className="h-[1.5em] w-auto object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
      />
      <span className="text-xs text-muted-foreground">图片</span>
      {children}
    </span>
  );
};
