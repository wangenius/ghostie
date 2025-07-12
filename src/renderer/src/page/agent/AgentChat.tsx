import { dialog } from "@/components/custom/DialogModal";
import { ImageElement } from "@/components/editor/elements/image";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cmd } from "@/utils/shell";
import Avatar from "boring-avatars";
import { observer } from "mobx-react-lite";
import { useCallback, useEffect, useRef, useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbArrowLeft,
  TbHistory,
  TbPencil,
  TbPlus,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { Descendant } from "slate";
import { toast } from "sonner";
import { AgentEditor } from "./AgentEditor";
import { EmptyChatMinimal } from "./EmptyChatMinimal";
import { HistoryPage } from "./HistoryDrawer";
import { ChatMessageItem } from "./MessageItem";
import { plainText, TypeArea } from "./TypeArea";

// 定义 MentionElement 接口
interface MentionElement {
  type: "mention";
  id: string;
  children: { text: string }[];
}

export const AgentChat = observer(() => {
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{ focus: () => void }>(null);
  const [mode, setMode] = useState<"chat" | "edit">("chat");
  /* Agent是否已在市场中 */
  const [isAgentInMarket, setIsAgentInMarket] = useState(false);

  const [value, setValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);

  const [historyOpen, setHistoryOpen] = useState(false);
  // 获取当前Agent的loading状态
  const loading = false;


  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const handleDeleteAgent = async () => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant ""?`,
    );
    if (answer) {
      try {
        toast.success("Successfully deleted agent");
      } catch (error) {
        console.error("delete agent error:", error);
      }
    }
  };
  // 提交消息
  const handleSubmit = useCallback(
    async (value: Descendant[]) => {
      console.log(value);
    },
    [],
  );
  // 上传机器人
  const handleUpload = useCallback(async () => {}, []);
  return (
    <div
      className="flex flex-col h-full border-none shadow-none bg-background/50"
    >
      {/* Agent信息头部 */}
      <div className="space-y-0 flex flex-row items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <Avatar
            size={32}
            name={""}
            variant="beam"
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            square={false}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {"未命名助手"}
              {mode === "edit" && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  编辑模式
                </span>
              )}
            </div>
            <p className="text-xs line-clamp-1 max-w-[260px]">
              {mode === "chat"
                ? "0.0.1"
                : "您正在编辑助手设置，完成后请点击返回"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {mode === "chat" ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  
                }}
              >
                <TbPlus className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setHistoryOpen(true)}
                size="icon"
                className="h-8 w-8"
              >
                <TbHistory className="h-4 w-4" />
              </Button>
              <Drawer
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                children={
                  <HistoryPage
                    onClick={async (item) => {
                      setHistoryOpen(false);
                      
                    }}
                  />
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMode("edit")}
              >
                <TbPencil className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <PiDotsThreeBold className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleDeleteAgent}>
                    <TbTrash className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleUpload}>
                    <TbUpload className="w-4 h-4 mr-2" />
                    {isAgentInMarket ? "更新" : "上传"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => setMode("chat")}
              className="gap-1"
            >
              <TbArrowLeft className="h-4 w-4" />
              返回聊天
            </Button>
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div
        key={`chat-${mode}`}
        className="flex-1 p-0 overflow-hidden"
      >
        {mode === "chat" && (
          <div className="flex flex-col h-full">
            { (
              <div
                ref={messagesContainerRef}
                className="px-4 py-4 w-full overflow-y-auto flex-1 scroll-smooth space-y-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--border) transparent",
                }}
              >
                {/* {messages.length === 0 && (
                  <EmptyChatMinimal />
                )} */}
                {/* {messages.length > 0 && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs mx-auto text-muted-foreground font-mono">
                      {new Date(
                        agent?.context.runtime.created_at || 0,
                      ).toLocaleString("zh-CN", {
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}

                {/* 当前聊天消息 */}
                  {[{
                    role: "user",
                    content: "Hello, how are you?",
                  }].map((msg, index) => (
                    <ChatMessageItem
                    key={`msg-${index}`}
                    message={msg}
                    index={index}
                    lastMessage={index > 0 ? msg : null}
                  />
                ))}

                {/* {messages.length !== 0 && (
                  <div className="h-4" ref={messagesEndRef} />
                )} */}
              </div>
            )}
          </div>
        )}
        {mode === "edit" && (
          <div className="flex flex-col h-full">
            <AgentEditor />
          </div>
        )}
      </div>

      {mode === "chat" && (
        <div key={`type-area`}>
          <TypeArea
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            editorRef={editorRef}
            currentAgent={""}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
});
