import { AgentProps } from "@/agent/types/agent";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChatModelManager } from "@/model/text/ChatModelManager";
import { CurrentSelectedAgent } from "@/page/agent/AgentsTab";
import { Page } from "@/utils/PageRouter";
import { useState } from "react";
import { TbDots, TbPencil, TbPin } from "react-icons/tb";

interface AgentItemProps {
  agent: AgentProps;
  isSelected: boolean;
  onClick: () => void;
}

export function AgentItem({ agent, isSelected, onClick }: AgentItemProps) {
  const [open, setOpen] = useState(false);
  const model = ChatModelManager.getModel(agent.models?.text);

  return (
    <div
      onClick={onClick}
      className={`
                	flex items-center gap-2 p-1 rounded-lg select-none group
                ${isSelected ? "bg-primary/10" : "hover:bg-secondary"}`}
    >
      <Button variant="ghost" size="icon">
        <LogoIcon className="w-4 h-4" />
      </Button>
      <div
        className={`
                        text-xs font-bold truncate space-x-4
                        ${isSelected ? "text-primary" : "text-foreground"}
                    `}
      >
        <span className="flex items-center gap-1 py-1">{agent.name}</span>
      </div>
      <div
        className={`flex items-center gap-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0"
        }`}
      >
        {model?.name}
      </div>
      <div className="flex-1"></div>

      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={`
						opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-primary/10 active:bg-primary/20
						${open ? "opacity-100" : "opacity-0"}
					`}
            size="icon"
          >
            <TbDots className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={async (e) => {
              e.stopPropagation();
            }}
          >
            <TbPin className="w-4 h-4" />
            置顶
          </DropdownMenuItem>
          <DropdownMenuItem
            className="flex items-center gap-2"
            onClick={() => {
              CurrentSelectedAgent.set(agent.id);
              Page.settings("agents");
            }}
          >
            <TbPencil className="w-4 h-4" />
            编辑
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
