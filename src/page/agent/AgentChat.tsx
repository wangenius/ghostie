import { Agent } from "@/agent/Agent";
import { ContextRuntime } from "@/agent/context/Runtime";
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
import { AgentMarket } from "@/market/agents";
import {
  AgentsListStore,
  CurrentAgentContextRuntime,
  CurrentAgentChatId,
  OpenedAgents,
  OpenedAgentsLoadingState,
} from "@/store/agents";
import { cmd } from "@/utils/shell";
import Avatar from "boring-avatars";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { PiDotsThreeBold } from "react-icons/pi";
import {
  TbArrowLeft,
  TbBrandWechat,
  TbHistory,
  TbPencil,
  TbPlus,
  TbTrash,
  TbUpload,
} from "react-icons/tb";
import { Descendant } from "slate";
import { toast } from "sonner";
import { AgentEditor } from "./AgentEditor";
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

export const AgentChat = memo(() => {
  const id = CurrentAgentChatId.use();
  const agent = OpenedAgents.get(id) || new Agent();
  const loadingState = OpenedAgentsLoadingState.use();
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

  // 使用自定义的ContextRuntime实例
  const context = CurrentAgentContextRuntime.use();
  const [historyOpen, setHistoryOpen] = useState(false);
  // 获取当前Agent的loading状态
  const loading = loadingState[agent.props.id] || false;

  // 设置loading状态的函数
  const setLoading = useCallback(
    (isLoading: boolean) => {
      OpenedAgentsLoadingState.set({
        ...loadingState,
        [agent.props.id]: isLoading,
      });
    },
    [agent.props.id, loadingState],
  );

  // 从context中获取当前消息
  const currentChat =
    context && context[agent.context.runtime.info.id]
      ? context[agent.context.runtime.info.id]?.messages
      : null;

  // 自动滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [context, currentChat]);

  const handleDeleteAgent = async () => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${agent.props.name}"?`,
    );
    if (answer) {
      try {
        AgentsListStore.delete(agent.props.id);
        close();
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
        agent.stop();
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
        await agent.chat(text, { images });
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
          await AgentMarket.uploadToMarket(agent.props);
          toast.success("Successfully uploaded agent to market");
        } catch (error) {
          toast.error(`Upload agent failed: ${error}`);
        }
      },
    });
  }, [agent]);
  return (
    <div
      key={`${agent.props.id}`}
      className="flex flex-col h-full border-none shadow-none bg-background/50"
    >
      {/* Agent信息头部 */}
      <div className="space-y-0 flex flex-row items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <Avatar
            size={32}
            name={agent.props.id}
            variant="beam"
            colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
            square={false}
          />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {agent.props.name || "未命名助手"}
              {mode === "edit" && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
                  编辑模式
                </span>
              )}
            </div>
            <p className="text-xs line-clamp-1 max-w-[260px]">
              {mode === "chat"
                ? agent.props.description || "AI助手随时为您服务"
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
                  const runtime = new ContextRuntime(agent);
                  agent.context.setRuntime(runtime);
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
                      const runtime = new ContextRuntime(
                        agent,
                        context[item.id],
                      );
                      agent.context.setRuntime(runtime);
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
        key={`chat-${agent.props.id}`}
        className="flex-1 p-0 overflow-hidden"
      >
        {mode === "chat" && (
          <div className="flex flex-col h-full">
            {agent?.props.id && (
              <div
                ref={messagesContainerRef}
                className="px-4 py-4 w-full overflow-y-auto flex-1 scroll-smooth"
                style={{
                  scrollbarWidth: "thin",
                  scrollbarColor: "var(--border) transparent",
                }}
              >
                {Object.values(context).length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
                      <TbBrandWechat className="w-7 h-7 text-muted-foreground" />
                    </div>
                    <h3 className="text-base font-medium mb-2">
                      开始与 {agent.props.name || "AI助手"} 对话
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md">
                      这是您与此助手的新对话。可以询问任何问题，助手将尽力为您提供帮助。
                    </p>
                  </div>
                )}

                {currentChat && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs mx-auto text-muted-foreground font-mono">
                      {new Date(
                        context[agent.context.runtime.info.id].created_at,
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
                {context[agent.context.runtime.info.id]?.messages.map(
                  (msg, index) => (
                    <ChatMessageItem
                      key={`msg-${context.id}-${index}`}
                      message={msg}
                      lastMessage={
                        context[agent.context.runtime.info.id].messages[
                          index - 1
                        ]
                      }
                      nextMessage={
                        context[agent.context.runtime.info.id].messages[
                          index + 1
                        ]
                      }
                    />
                  ),
                )}

                {Object.values(context).length !== 0 && (
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
        <div key={`type-area-${agent.props.id}`}>
          <TypeArea
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            editorRef={editorRef}
            currentAgent={agent.props.id}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
});
