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
      style={{
        fontSize: "12px",
      }}
      className={cn(
        "inline-flex items-center translate-y-0.5 py-1 bg-muted-foreground text-muted px-2 rounded-md text-xs m-0 mx-1",
        select && focus && "bg-muted-foreground/80 ring-1 ring-primary",
      )}
      {...attributes}
      contentEditable={false}
      title="点击查看原图"
    >
      <img
        src={`data:${element.contentType};base64,${element.base64Image}`}
        alt=""
        className="h-[1.2em] select-none w-auto object-contain rounded cursor-pointer hover:opacity-90 transition-opacity"
      />
      <span className="max-w-[300px] truncate ml-1 select-none">图片</span>
      {children}
    </span>
  );
};
