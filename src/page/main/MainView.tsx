import { Agent, AgentStore } from "@/agent/Agent";
import { AgentProps } from "@/agent/types/agent";
import { LogoIcon } from "@/components/custom/LogoIcon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { ChatHistory } from "@/model/text/HistoryMessage";
import { SettingsManager } from "@/settings/SettingsManager";
import { Page } from "@/utils/PageRouter";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { memo, useCallback, useEffect, useRef } from "react";
import {
  TbArrowBigLeft,
  TbClockDown,
  TbDots,
  TbFileUpload,
  TbHeartDown,
  TbHistory,
  TbLoader2,
  TbPaperclip,
  TbPhotoUp,
  TbSettings,
  TbSortDescending2,
} from "react-icons/tb";
import { AgentItem } from "./components/AgentItem";
import { MessageItem } from "./components/MessageItem";
import { Echoa } from "echo-state";

type SortType = "default" | "mostUsed" | "recentUsed";

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

  // 初始化选中的agent
  useEffect(() => {
    const list = Object.values(agents);
    if (list.length > 0 && !state.selectedAgentId) {
      mainState.set({ selectedAgentId: list[0].id });
    }
  }, [agents]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <Header />
      <main className="flex-1 overflow-hidden pb-4">
        <div className="h-full overflow-y-auto">
          {!agent.props.id && <AgentListPanel />}
          {agent.props.id && <ChatBox />}
        </div>
      </main>
    </div>
  );
}

const Header = memo(() => {
  const sortType = SettingsManager.use((state) => state.sortType);
  const state = mainState.use();
  const inputRef = useRef<HTMLInputElement>(null);
  const agents = AgentStore.use();
  const list = Object.values(agents);
  const agent = CurrentTalkAgent.use();
  const handleSettingsClick = useCallback(() => {
    Page.to("settings");
  }, []);

  const handleHistoryClick = useCallback(() => {
    Page.to("history");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      mainState.set({ currentInput: e.target.value });
    },
    [],
  );

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
        inputRef.current?.focus();
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
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        const currentIndex = list.findIndex(
          (agent) => agent.id === state.selectedAgentId,
        );
        const newIndex =
          e.key === "ArrowUp"
            ? (currentIndex - 1 + list.length) % list.length
            : (currentIndex + 1) % list.length;
        mainState.set({ selectedAgentId: list[newIndex].id });
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [state.selectedAgentId, list]);
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
  }, [state.isLoading]);
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmedInput = state.currentInput.trim();
        if (!trimmedInput) return;

        mainState.set({ currentInput: "", isLoading: true });

        try {
          if (!agent.props.id) {
            const agent = await Agent.get(state.selectedAgentId);
            CurrentTalkAgent.set(agent, { replace: true });
            console.log(agent.props);

            await agent.chat(trimmedInput);
          } else {
            console.log(agent);
            await agent.chat(trimmedInput);
          }
        } catch (error) {
          console.error(error);
        } finally {
          mainState.set({ isLoading: false });
        }
      }
    },
    [state.currentInput, state.selectedAgentId, agent],
  );

  return (
    <div className="px-3 draggable">
      <div className="mx-auto flex items-center h-12">
        <div className="p-1.5 bg-muted rounded-md flex items-center gap-2 text-xs hover:bg-muted-foreground/15 transition-colors">
          <LogoIcon className="w-4 h-4" />
          {list.find((agent) => agent.id === state.selectedAgentId)?.name ||
            list[0]?.name}
        </div>
        <div className="flex-1 pl-2">
          <Input
            ref={inputRef}
            value={state.currentInput}
            variant="ghost"
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="text-[13px]"
            placeholder={"Type here..."}
          />
        </div>
        <div className="flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="text-xs">
                <TbPaperclip className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <TbFileUpload className="w-4 h-4" />
                File
              </DropdownMenuItem>
              <DropdownMenuItem>
                <TbPhotoUp className="w-4 h-4" />
                Image
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!agent.props.id && (
            <div className="">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-xs">
                    {sortType === "default" && (
                      <TbSortDescending2 className="w-4 h-4 mr-0.5" />
                    )}
                    {sortType === "mostUsed" && (
                      <TbHeartDown className="w-4 h-4 mr-0.5" />
                    )}
                    {sortType === "recentUsed" && (
                      <TbClockDown className="w-4 h-4 mr-0.5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={sortType}
                    onValueChange={(value) =>
                      SettingsManager.setSortType(value as SortType)
                    }
                  >
                    <DropdownMenuRadioItem value="default">
                      Default
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="mostUsed">
                      Most Used
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="recentUsed">
                      Recent Used
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
          {agent.props.id && (
            <Button onClick={handleActionClick} size="icon">
              {state.isLoading ? (
                <TbLoader2 className="h-4 w-4 animate-spin" />
              ) : (
                <TbArrowBigLeft className="h-4 w-4" />
              )}
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <TbDots className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
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
        </div>
      </div>
    </div>
  );
});

const AgentListPanel = memo(() => {
  const state = mainState.use();
  const agents = AgentStore.use();
  const agent = CurrentTalkAgent.use();
  const handleAgentClick = useCallback(
    async (props: AgentProps) => {
      CurrentTalkAgent.set(new Agent(props));
      const trimmedInput = state.currentInput.trim();
      if (trimmedInput) {
        await agent.chat(trimmedInput);
      }
    },
    [state.currentInput],
  );

  const selectedAgentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedAgentRef.current) {
      selectedAgentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [state.selectedAgentId]);

  return (
    <div className="container mx-auto px-4 max-w-2xl space-y-1 overflow-y-auto">
      {Object.values(agents).map((agent) => (
        <div
          key={agent.id}
          ref={agent.id === state.selectedAgentId ? selectedAgentRef : null}
        >
          <AgentItem
            agent={agent}
            isSelected={agent.id === state.selectedAgentId}
            onClick={() => handleAgentClick(agent)}
          />
        </div>
      ))}
    </div>
  );
});

const ChatBox = memo(() => {
  const agent = CurrentTalkAgent.use();
  const list = ChatHistory.use();
  const message = list[agent.engine.model?.historyMessage.id];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list]);

  if (!message) {
    return null;
  }

  return (
    <div className="px-2 space-y-2 my-2">
      {message.list.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});
