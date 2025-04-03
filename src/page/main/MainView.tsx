import { Agent } from "@/agent/Agent";
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
import { ChatManager } from "@/page/history/ChatManager";
import { SettingsManager } from "@/settings/SettingsManager";
import { Page } from "@/utils/PageRouter";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type SortType = "default" | "mostUsed" | "recentUsed";

/* 主界面 */
export function MainView() {
  const {
    isActive,
    currentInput,
    isLoading,
    currentAgent,
    updateInput,
    setLoading,
    startChat,
    endChat,
  } = ChatManager.useChat();

  const agents = Agent.list.use();
  const agentList = Object.values(agents);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(
    () => agentList[0]?.id || "",
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // 对机器人列表进行排序
  const sortedAgents = useMemo(() => {
    const list = [...agentList];
    return list;
  }, [agentList]);

  // 使用useMemo缓存selectedAgent
  const selectedAgent = useMemo(
    () =>
      sortedAgents.find((agent) => agent.id === selectedAgentId) ||
      sortedAgents[0],
    [sortedAgents, selectedAgentId],
  );

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      // 发送消息
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmedInput = currentInput.trim();
        if (!trimmedInput) return;
        updateInput("");
        /* 开始聊天 */
        if (!isActive) {
          /* 记录使用历史 */
          // Agent.updateMeta({
          //   id: selectedAgent.id,
          //   usageCount: (selectedAgent.usageCount || 0) + 1,
          //   lastUsed: Date.now(),
          // });
          /* 开始聊天 */
          const agent = await startChat(selectedAgent);
          /* 设置加载状态 */
          setLoading(true);
          try {
            await agent.chat(trimmedInput);
          } finally {
            setLoading(false);
          }
        } else if (currentAgent) {
          setLoading(true);
          try {
            await currentAgent.chat(trimmedInput);
          } finally {
            setLoading(false);
          }
        }
      }
    },
    [
      currentInput,
      isActive,
      selectedAgent,
      currentAgent,
      startChat,
      updateInput,
      setLoading,
    ],
  );

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 聚焦输入框
      if (e.ctrlKey && e.key.toLowerCase() === "i") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.ctrlKey && e.key.toLowerCase() === "h") {
        e.preventDefault();
        Page.to("history");
        return;
      }
      if (e.ctrlKey && e.key.toLowerCase() === "o") {
        e.preventDefault();
        endChat();
      }
      // 打开设置
      if (e.ctrlKey && e.key === ",") {
        e.preventDefault();
        Page.to("settings");
        return;
      }
      // 选择助手
      if (!isActive && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        const currentIndex = sortedAgents.findIndex(
          (agent) => agent.id === selectedAgentId,
        );
        const newIndex =
          e.key === "ArrowUp"
            ? (currentIndex - 1 + sortedAgents.length) % sortedAgents.length
            : (currentIndex + 1) % sortedAgents.length;
        setSelectedAgentId(sortedAgents[newIndex].id);
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isActive, selectedAgentId, sortedAgents.length, endChat]);

  return (
    <div className="flex flex-col h-screen bg-background">
      <MemoizedHeader
        inputRef={inputRef}
        currentInput={currentInput}
        isLoading={isLoading}
        isActive={isActive}
        currentAgent={currentAgent}
        agentList={sortedAgents}
        selectedAgentId={selectedAgentId}
        onInputChange={updateInput}
        onKeyDown={handleKeyDown}
        onEndChat={endChat}
        onSelectAgent={setSelectedAgentId}
      />
      <main className="flex-1 overflow-hidden pb-4">
        <div className="h-full overflow-y-auto">
          {!isActive && (
            <MemoizedAgentList
              agentList={sortedAgents}
              selectedAgentId={selectedAgentId}
              currentInput={currentInput}
              onSelectAgent={setSelectedAgentId}
              onStartChat={startChat}
            />
          )}
          {isActive && currentAgent && (
            <MemoizedChatBox currentAgent={currentAgent} onEndChat={endChat} />
          )}
        </div>
      </main>
    </div>
  );
}

interface HeaderProps {
  inputRef: React.RefObject<HTMLInputElement>;
  currentInput: string;
  isLoading: boolean;
  isActive: boolean;
  currentAgent?: Agent;
  agentList: AgentProps[];
  selectedAgentId: string;
  onInputChange: (value: string) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onEndChat: () => void;
  onSelectAgent: (id: string) => void;
}

const Header = memo(function Header({
  inputRef,
  currentInput,
  isLoading,
  isActive,
  currentAgent,
  agentList,
  selectedAgentId,
  onInputChange,
  onKeyDown,
  onEndChat,
}: HeaderProps) {
  const sortType = SettingsManager.use((state) => state.sortType);
  const handleSettingsClick = useCallback(() => {
    Page.to("settings");
  }, []);

  const handleHistoryClick = useCallback(() => {
    Page.to("history");
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onInputChange(e.target.value);
    },
    [onInputChange],
  );

  const handleActionClick = useCallback(() => {
    if (isActive) {
      if (isLoading) {
        currentAgent?.stop();
      } else {
        onEndChat();
      }
    }
  }, [isActive, isLoading, currentAgent, onEndChat]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        if (isActive && isLoading) {
          currentAgent?.stop();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isActive, isLoading, currentAgent, onEndChat]);

  return (
    <div className="px-3 draggable">
      <div className="mx-auto flex items-center h-12">
        <div className="p-1.5 bg-muted rounded-md flex items-center gap-2 text-xs hover:bg-muted-foreground/15 transition-colors">
          <LogoIcon className="w-4 h-4" />
          {agentList.find((agent) => agent.id === selectedAgentId)?.name ||
            agentList[0]?.name}
        </div>
        <div className="flex-1 pl-2">
          <Input
            ref={inputRef}
            value={currentInput}
            variant="ghost"
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
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
          {!isActive && (
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
          {isActive && (
            <Button onClick={handleActionClick} size="icon">
              {isLoading ? (
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

interface AgentListProps {
  agentList: AgentProps[];
  selectedAgentId: string;
  currentInput: string;
  onSelectAgent: (id: string) => void;
  onStartChat: (agent: AgentProps) => void;
}

const AgentList = memo(function AgentList({
  agentList,
  selectedAgentId,
  currentInput,
  onSelectAgent,
  onStartChat,
}: AgentListProps) {
  const handleAgentClick = useCallback(
    (agent: AgentProps) => {
      const trimmedInput = currentInput.trim();
      if (trimmedInput) {
        onStartChat(agent);
      } else {
        onSelectAgent(agent.id);
      }
    },
    [currentInput, onStartChat, onSelectAgent],
  );

  // 添加ref用于滚动
  const selectedAgentRef = useRef<HTMLDivElement>(null);

  // 当选中的agent改变时，确保其可见
  useEffect(() => {
    if (selectedAgentRef.current) {
      selectedAgentRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedAgentId]);

  return (
    <div className="container mx-auto px-4 max-w-2xl space-y-1 overflow-y-auto">
      {agentList.map((agent) => (
        <div
          key={agent.id}
          ref={agent.id === selectedAgentId ? selectedAgentRef : null}
        >
          <AgentItem
            agent={agent}
            isSelected={agent.id === selectedAgentId}
            onClick={() => handleAgentClick(agent)}
          />
        </div>
      ))}
    </div>
  );
});

interface ChatBoxProps {
  currentAgent: Agent;
  onEndChat: () => void;
}

const ChatBox = memo(function ChatBox({
  currentAgent,
  onEndChat,
}: ChatBoxProps) {
  const list = ChatHistory.use();
  const message = list[currentAgent.model.historyMessage.id];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  if (!message) {
    onEndChat();
    return null;
  }

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list]);

  return (
    <div className="px-2 space-y-2 my-2">
      {message.list.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});

const MemoizedHeader = memo(Header);
const MemoizedAgentList = memo(AgentList);
const MemoizedChatBox = memo(ChatBox);
