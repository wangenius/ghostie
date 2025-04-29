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
import { Echoi } from "@/lib/echo/Echo";
import { AgentManager } from "@/store/AgentManager";
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

const ChatViewMode = new Echoi<"chat" | "edit">("chat");

// 定义 MentionElement 接口
interface MentionElement {
  type: "mention";
  id: string;
  children: { text: string }[];
}

export const AgentChat = observer(() => {
  const id = AgentManager.currentOpenedAgent.use();
  const agent = AgentManager.OPENED_AGENTS.get(id);
  const loadingState = AgentManager.loadingState.use();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<{ focus: () => void }>(null);
  const mode = ChatViewMode.use();

  const [value, setValue] = useState<Descendant[]>([
    {
      type: "paragraph",
      children: [{ text: "" }],
    },
  ]);

  const [historyOpen, setHistoryOpen] = useState(false);
  // 获取当前Agent的loading状态
  const loading = loadingState[agent?.infos.id || ""] || false;

  // 设置loading状态的函数
  const setLoading = useCallback(
    (isLoading: boolean) => {
      AgentManager.loadingState.set({
        ...loadingState,
        [agent?.infos.id || ""]: isLoading,
      });
    },
    [agent?.infos.id, loadingState],
  );

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [agent?.context.runtime]);

  const handleDeleteAgent = async () => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${agent?.infos.name}"?`,
    );
    if (answer) {
      try {
        AgentManager.OPENED_AGENTS.delete(agent?.infos.id || "");
        AgentManager.list.delete(agent?.infos.id || "");
        toast.success("Successfully deleted agent");
      } catch (error) {
        console.error("delete agent error:", error);
      }
    }
  };
  // 提交消息
  const handleSubmit = useCallback(
    async (value: Descendant[]) => {
      // 如果正在加载，停止当前请求
      if (loading) {
        agent?.stop();
        return;
      }

      // 检查消息是否为空
      const text = plainText(value);
      if (!text.trim()) {
        return;
      }

      // 提取所有 mention 元素和图片元素
      const mentions: { id: string; text: string }[] = [];
      const images: { contentType: string; base64Image: string }[] = [];

      // 遍历所有节点寻找 mention 和 image 类型的元素
      const extractElements = (nodes: Descendant[]) => {
        for (const node of nodes) {
          // 判断节点是否为 mention 类型
          if ("type" in node) {
            if (node.type === "mention" && "id" in node) {
              const mentionNode = node as MentionElement;
              mentions.push({
                id: mentionNode.id,
                text: mentionNode.children[0].text,
              });
            } else if (node.type === "image") {
              const imageNode = node as ImageElement;
              images.push({
                contentType: imageNode.contentType,
                base64Image: imageNode.base64Image,
              });
            }
          }

          // 递归遍历子节点
          if ("children" in node && Array.isArray(node.children)) {
            extractElements(node.children);
          }
        }
      };

      extractElements(value);

      // 重置输入框
      setValue([
        {
          type: "paragraph",
          children: [{ text: "" }],
        },
      ]);

      // 发送消息并处理响应
      setLoading(true);
      try {
        await agent?.chat(text, { images });
      } catch (error) {
        console.error("发送消息失败:", error);
      } finally {
        setLoading(false);
      }
    },
    [agent, loading, setLoading],
  );
  // 上传机器人
  const handleUpload = useCallback(async () => {
    if (!agent) return;
    dialog.confirm({
      title: "Upload Agent",
      content: "Are you sure you want to upload this agent?",
      onOk: async () => {
        try {
          await AgentManager.uploadToMarket(agent.infos);
          toast.success("Successfully uploaded agent to market");
        } catch (error) {
          toast.error(`Upload agent failed: ${error}`);
        }
      },
    });
  }, [agent]);
  return (
    <div
      key={`${agent?.infos.id}`}
      className="flex flex-col h-full border-none shadow-none bg-background/50"
    >
      {/* Agent信息头部 */}
      <div className="space-y-0 flex flex-row items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <Avatar
            size={32}
            name={agent?.infos.id || ""}
            variant="beam"
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            square={false}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {agent?.infos.name || "未命名助手"}
              {mode === "edit" && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  编辑模式
                </span>
              )}
            </div>
            <p className="text-xs line-clamp-1 max-w-[260px]">
              {mode === "chat"
                ? agent?.infos.description || "AI助手随时为您服务"
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
                  if (!agent) return;
                  agent?.context.setRuntime();
                  AgentManager.CurrentContexts.set({
                    [agent.infos.id]: agent.context.runtime.id,
                  });
                }}
              >
                <TbPlus className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => setHistoryOpen(true)}
                size="sm"
                className="text-xs text-muted-foreground"
              >
                <TbHistory className="h-4 w-4" />
                历史
              </Button>
              <Drawer
                open={historyOpen}
                onOpenChange={setHistoryOpen}
                children={
                  <HistoryPage
                    onClick={async (item) => {
                      setHistoryOpen(false);
                      if (!agent) return;
                      agent?.context.setRuntime(item);
                    }}
                  />
                }
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => ChatViewMode.set("edit")}
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
                    Upload
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              size="sm"
              onClick={() => ChatViewMode.set("chat")}
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
        key={`chat-${agent?.infos.id}`}
        className="flex-1 p-0 overflow-hidden"
      >
        {mode === "chat" && (
          <div className="flex flex-col h-full">
            {agent?.infos.id && (
              <div
                ref={messagesContainerRef}
                className="px-4 py-4 w-full overflow-y-auto flex-1 scroll-smooth space-y-1"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--border) transparent",
                }}
              >
                {agent?.context.runtime.messages.length === 0 && (
                  <EmptyChatMinimal agent={agent} />
                )}

                {agent?.context.runtime.messages.length > 0 && (
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
                {agent?.context.runtime.messages.map((msg, index) => (
                  <ChatMessageItem
                    key={`msg-${agent?.context.runtime.id}-${index}`}
                    message={msg}
                    lastMessage={agent?.context.runtime.messages[index - 1]}
                    nextMessage={agent?.context.runtime.messages[index + 1]}
                  />
                ))}

                {agent?.context.runtime.messages.length !== 0 && (
                  <div className="h-4" ref={messagesEndRef} />
                )}
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
        <div key={`type-area-${agent?.infos.id}`}>
          <TypeArea
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            editorRef={editorRef}
            currentAgent={agent?.infos.id || ""}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
});
