import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAgent, useAgentChat } from "@/hooks/useAgent";
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
  TbStethoscope,
  TbTrash
} from "react-icons/tb";
import { Descendant } from "slate";
import { toast } from "sonner";
import { AgentEditor } from "./AgentEditor";
import { EmptyChatMinimal } from "./EmptyChatMinimal";
import { HistoryPage } from "./HistoryDrawer";
import { ChatMessageItem } from "./MessageItem";
import { plainText, TypeArea } from "../../components/TypeArea";

// 从useAgent hook导入的类型
type AgentInfos = NonNullable<ReturnType<typeof useAgent>["agents"][string]>;

// 定义 AgentChat 组件的 props
interface AgentChatProps {
  agent: AgentInfos;
}

export const AgentChat = observer(({ agent }: AgentChatProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{ focus: () => void }>(null);
  const [mode, setMode] = useState<"chat" | "edit">("chat");
  const [value, setValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);

  const [historyOpen, setHistoryOpen] = useState(false);

  // 使用 useAgentChat hook
  const { 
    messages, 
    loading, 
    sendMessage, 
    clearMessages, 
    loadChatSession,
    getChatSessions,
    deleteChatSession,
    deleteAllChatSessions,
    diagnoseAgent 
  } = useAgentChat(agent.id);

  const { deleteAgent } = useAgent();

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleDeleteAgent = async () => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${agent.name}"?`,
    );
    if (answer) {
      try {
        await deleteAgent(agent.id);
        toast.success("Successfully deleted agent");
      } catch (error) {
        console.error("delete agent error:", error);
        toast.error("Failed to delete agent");
      }
    }
  };

  // 提交消息
  const handleSubmit = useCallback(
    async (value: Descendant[]) => {
      const content = plainText(value).trim();
      if (!content) return;

      try {
        await sendMessage(content);
        // 清空输入框
        setValue([
          {
            type: "paragraph",
            children: [{ text: "" }],
          },
        ]);
      } catch (error) {
        console.error("发送消息失败:", error);
        toast.error("发送消息失败");
      }
    },
    [sendMessage],
  );

  // 清空聊天记录
  const handleNewChat = useCallback(async () => {
    await clearMessages();
  }, [clearMessages]);

  // 执行诊断
  const handleDiagnose = async () => {
    try {
      const result = await diagnoseAgent();

      // 显示诊断结果对话框
      dialog({
        title: "配置诊断结果",
        description: "检查Agent配置是否正确",
        content: (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  result.status === "ok"
                    ? "bg-green-500"
                    : result.status === "warning"
                      ? "bg-yellow-500"
                      : "bg-red-500"
                }`}
              />
              <span className="font-medium">
                {result.status === "ok"
                  ? "配置正常"
                  : result.status === "warning"
                    ? "发现警告"
                    : "发现错误"}
              </span>
            </div>

            {result.issues.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">问题:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.issues.map((issue, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      {issue}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">建议:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-blue-500 mt-1">•</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ),
        footer: (close) => (
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={close}>
              关闭
            </Button>
            {result.status !== "ok" && (
              <Button
                onClick={() => {
                  close();
                  setMode("edit");
                }}
              >
                去设置
              </Button>
            )}
          </div>
        ),
      });

      // 如果有问题，显示toast提示
      if (result.status === "error") {
        toast.error("发现配置问题，请查看诊断结果");
      } else if (result.status === "warning") {
        toast.warning("发现一些警告，请查看诊断结果");
      } else {
        toast.success("配置正常");
      }
    } catch (error) {
      console.error("诊断失败:", error);
      toast.error("诊断失败");
    }
  };

  return (
    <div className="flex flex-col h-full border-none shadow-none bg-background/50">
      {/* Agent信息头部 */}
      <div className="space-y-0 flex flex-row items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <Avatar
            size={32}
            name={agent.name || agent.id}
            variant="beam"
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            square={false}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {agent.name || "未命名助手"}
              {mode === "edit" && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  编辑模式
                </span>
              )}
            </div>
            <p className="text-xs line-clamp-1 max-w-[260px]">
              {mode === "chat"
                ? agent.version || "0.0.1"
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
                onClick={handleNewChat}
                title="新建对话"
              >
                <TbPlus className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setHistoryOpen(true)}
                size="icon"
                className="h-8 w-8"
                title="历史记录"
              >
                <TbHistory className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleDiagnose}
                title="诊断配置问题"
              >
                <TbStethoscope className="h-4 w-4" />
              </Button>
              <Drawer
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                children={
                  <HistoryPage
                    agent={agent}
                    getChatSessions={getChatSessions}
                    onClick={(session) => {
                      setHistoryOpen(false);
                      loadChatSession(session.id);
                    }}
                    onDeleteSession={async (sessionId) => {
                      try {
                        await deleteChatSession(sessionId);
                        toast.success("会话删除成功");
                      } catch (error) {
                        toast.error("删除会话失败");
                      }
                    }}
                    onDeleteAll={async () => {
                      try {
                        await deleteAllChatSessions();
                        toast.success("所有会话删除成功");
                      } catch (error) {
                        toast.error("删除所有会话失败");
                      }
                    }}
                  />
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMode("edit")}
                title="编辑助手"
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
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button size="sm" onClick={() => setMode("chat")} className="gap-1">
              <TbArrowLeft className="h-4 w-4" />
              返回聊天
            </Button>
          )}
        </div>
      </div>

      {/* 聊天区域 */}
      <div key={`chat-${mode}`} className="flex-1 p-0 overflow-hidden">
        {mode === "chat" && (
          <div className="flex flex-col h-full">
            <div
              ref={messagesContainerRef}
              className="px-4 py-4 w-full overflow-y-auto flex-1 scroll-smooth space-y-1"
              style={{
                scrollbarWidth: "thin",
                scrollbarColor: "var(--border) transparent",
              }}
            >
              {messages.length === 0 ? (
                <EmptyChatMinimal agent={agent} />
              ) : (
                <>
                  {messages.map((message, index) => (
                    <ChatMessageItem
                      key={message.created_at.toString()}
                      message={message}
                      index={index}
                      lastMessage={index > 0 ? messages[index - 1] : null}
                    />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* 输入区域 */}
            <div className="border-t px-4 py-3">
              <TypeArea
                editorRef={editorRef}
                value={value}
                onChange={setValue}
                onSubmit={handleSubmit}
                currentAgent={agent.name || "助手"}
                loading={loading}
              />
            </div>
          </div>
        )}

        {mode === "edit" && <AgentEditor agent={agent} />}
      </div>
    </div>
  );
});
