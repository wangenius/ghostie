import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clock, Trash2, MessageCircle } from "lucide-react";
import { Message } from "../types";

interface ChatHistory {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
  messages: Message[];
}

export function HistoryView() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [selectedHistory, setSelectedHistory] = useState<ChatHistory | null>(null);

  useEffect(() => {
    loadHistories();
  }, []);

  const loadHistories = async () => {
    try {
      const list = await invoke<ChatHistory[]>("list_histories");
      setHistories(list);
    } catch (error) {
      console.error("加载历史记录失败:", error);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke("delete_history", { id });
      await loadHistories();
      if (selectedHistory?.id === id) {
        setSelectedHistory(null);
      }
    } catch (error) {
      console.error("删除历史记录失败:", error);
    }
  };

  if (histories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-muted-foreground py-12">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <div className="text-sm">暂无历史记录</div>
      </div>
    );
  }

  if (selectedHistory) {
    return (
      <div className="space-y-1 py-2·">
        <button
          onClick={() => setSelectedHistory(null)}
          className="text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          ← 返回历史记录列表
        </button>
        <div className="space-y-1">
          {selectedHistory.messages.map((message, index) => (
            <div
              key={index}
              className={`p-2 rounded-lg ${
                message.role === "user" ? "bg-primary/10" : "bg-secondary"
              }`}
            >
              <div className="text-xs text-muted-foreground mb-2">
                {message.role === "user" ? "你" : "助手"}
              </div>
              <div className="text-sm !select-text text-foreground whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {histories.map((history) => (
        <div
          key={history.id}
          className="p-2 bg-card border border-border rounded-lg hover:border-border/80 hover:shadow-sm transition-all group cursor-pointer"
          onClick={() => setSelectedHistory(history)}
        >
          <div className="flex items-start gap-2">
            <div className="flex-shrink-0 p-2 bg-secondary rounded-lg">
              <MessageCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-foreground truncate">
                  {history.title}
                </h3>
                <div className="flex items-center gap-2"> <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-secondary text-xs text-muted-foreground">
                  {history.messages.length} 条消息
                </span>
              </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(history.timestamp).toLocaleDateString()} {new Date(history.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(history.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-secondary text-muted-foreground hover:text-destructive transition-colors"
                      title="删除对话"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="text-sm text-muted-foreground line-clamp-1 break-all">
                {history.preview}
              </div>
              
             
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
