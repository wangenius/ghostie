import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TbClock, TbMessageCircle, TbTrash } from "react-icons/tb";
import { useAgent } from "@/hooks/useAgent";
import { useState, useEffect } from "react";

// 从useAgent hook导入的类型
type AgentInfos = NonNullable<ReturnType<typeof useAgent>["agents"][string]>;

interface ChatSession {
  id: string;
  agentId: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
}

interface HistoryPageProps {
  agent?: AgentInfos;
  sessions?: ChatSession[];
  getChatSessions?: () => Promise<ChatSession[]>;
  onClick: (session: ChatSession) => void;
  onDeleteSession?: (sessionId: string) => void;
  onDeleteAll?: () => void;
}

export const HistoryPage = ({
  agent,
  sessions = [],
  getChatSessions,
  onClick,
  onDeleteSession,
  onDeleteAll,
}: HistoryPageProps) => {
  const [realSessions, setRealSessions] = useState<ChatSession[]>([]);

  // 加载真实的聊天会话
  useEffect(() => {
    const loadSessions = async () => {
      if (getChatSessions) {
        try {
          const sessions = await getChatSessions();
          setRealSessions(sessions);
        } catch (error) {
          console.error("加载聊天会话失败:", error);
        }
      }
    };

    loadSessions();
  }, [getChatSessions]);

  const displaySessions = realSessions.length > 0 ? realSessions : sessions;

  const handleDeleteSession = async (
    sessionId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (onDeleteSession) {
      await onDeleteSession(sessionId);
      // 刷新会话列表
      if (getChatSessions) {
        try {
          const sessions = await getChatSessions();
          setRealSessions(sessions);
        } catch (error) {
          console.error("刷新会话列表失败:", error);
        }
      }
    }
  };

  const handleDeleteAll = async () => {
    if (onDeleteAll) {
      await onDeleteAll();
      // 清空会话列表
      setRealSessions([]);
    }
  };

  return (
    <div className="flex flex-col h-full gap-1">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          历史对话 {agent?.name ? `- ${agent.name}` : ""}
        </h3>
        {displaySessions.length > 0 && (
          <Button
            variant="destructive"
            size="sm"
            className="flex-none"
            onClick={handleDeleteAll}
          >
            <TbTrash className="h-4 w-4" />
            删除全部
          </Button>
        )}
      </div>

      {displaySessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
          <TbMessageCircle className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">暂无历史对话</p>
        </div>
      ) : (
        displaySessions
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((session) => (
            <div
              key={session.id}
              onClick={() => onClick(session)}
              className={cn(
                "p-2 rounded-lg cursor-pointer transition-colors group",
                "hover:bg-muted-foreground/10",
              )}
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TbClock className="h-4 w-4" />
                  <span className="text-xs">
                    {new Date(session.createdAt).toLocaleString("zh-CN", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {onDeleteSession && (
                  <Button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <TbTrash className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <h3 className="text-xs my-1 font-medium line-clamp-2">
                {session.title ||
                  session.messages?.[0]?.content ||
                  "无标题对话"}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <TbMessageCircle className="h-3.5 w-3.5" />
                <span>{session.messages.length} 条消息</span>
              </div>
            </div>
          ))
      )}
    </div>
  );
};
