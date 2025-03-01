import { cmd } from "@/utils/shell";
import { TbX } from "react-icons/tb";
import { Button } from "../ui/button";

export const Header = ({
  title,
  close = () => cmd.close(),
  extra,
}: {
  title: string;
  close?: () => void;
  extra?: React.ReactNode;
}) => {
  return (
    <div className="flex select-none draggable justify-between items-center p-3">
      <span className="text-xs pl-2 text-muted-foreground">
        <img src="/icon.png" className="w-6 h-6" />
      </span>
      <div className="text-sm pl-3 flex-1 font-medium text-foreground">
        {title}
      </div>
      <div className="flex items-center gap-2">
        {extra}
        <Button size="icon" onClick={close}>
          <TbX className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
