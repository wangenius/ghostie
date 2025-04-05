import { Agent, AgentStore } from "@/agent/Agent";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Page } from "@/utils/PageRouter";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { Echoa } from "echo-state";
import { useCallback, useEffect, useRef } from "react";
import { TbCornerRightUp, TbHistory, TbSettings } from "react-icons/tb";
import { TypeArea } from "./chat/ChatArea";
interface MainViewState {
  /* 当前输入 */
  currentInput: string;
  /* 是否正在加载 */
  isLoading: boolean;
  /* 选中的agent */
  selectedAgentId: string;
}

const initialState: MainViewState = {
  currentInput: "",
  isLoading: false,
  selectedAgentId: "",
};

/* 主界面状态 */
const mainState = new Echoa(initialState);
/* 当前对话的agent */
export const CurrentTalkAgent = new Echoa<Agent>(new Agent());

/* 主界面 */
export function MainView() {
  const agents = AgentStore.use();
  const state = mainState.use();
  const agent = CurrentTalkAgent.use();
  const editorRef = useRef<HTMLDivElement>(null);

  // 初始化选中的agent
  useEffect(() => {
    const list = Object.values(agents);
    if (list.length > 0 && !state.selectedAgentId) {
      mainState.set({ selectedAgentId: list[0].id });
    }
  }, [agents]);

  const handleSettingsClick = useCallback(() => {
    Page.to("settings");
  }, []);

  const handleHistoryClick = useCallback(() => {
    Page.to("history");
  }, []);

  const handleActionClick = useCallback(() => {
    if (agent.props.id) {
      if (state.isLoading) {
        agent.stop();
      } else {
        // 无论是否正在加载，点击按钮都重置 Agent
        CurrentTalkAgent.set(new Agent(), { replace: true });
      }
    }
  }, [state.isLoading, agent]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        editorRef.current?.focus();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        Page.to("history");
      }
      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        handleActionClick();
      }
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        Page.to("settings");
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [handleActionClick]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (state.isLoading) {
          agent.stop();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [state.isLoading, agent]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <main className="flex-1 overflow-hidden flex flex-col">
        <TypeArea />
      </main>
      <div className="px-1.5 draggable">
        <div className="mx-auto flex items-center justify-between h-10">
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              className="no-drag rounded-[8px] cursor-pointer"
            >
              <div className="p-1.5 select-none rounded-[6px] cursor-pointer flex items-center gap-2 text-xs hover:bg-muted-foreground/15 transition-colors">
                <LogoIcon className="w-4 h-4" />
                Ghostie
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={handleHistoryClick}
              >
                <TbHistory className="h-4 w-4" />
                History
              </DropdownMenuItem>
              <DropdownMenuItem
                className="flex items-center gap-2"
                onClick={handleSettingsClick}
              >
                <TbSettings className="h-4 w-4" />
                Settings
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" className="no-drag">
            ctrl + enter
            <TbCornerRightUp className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
