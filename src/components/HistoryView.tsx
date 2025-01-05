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
      <div className="flex flex-col items-center justify-center text-gray-500 py-12">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <div className="text-sm">暂无历史记录</div>
      </div>
    );
  }

  if (selectedHistory) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedHistory(null)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          ← 返回历史记录列表
        </button>
        <div className="space-y-4">
          {selectedHistory.messages.map((message, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg ${
                message.role === "user" ? "bg-blue-50" : "bg-gray-50"
              }`}
            >
              <div className="text-xs text-gray-500 mb-2">
                {message.role === "user" ? "你" : "助手"}
              </div>
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {histories.map((history) => (
        <div
          key={history.id}
          className="p-4 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all group cursor-pointer"
          onClick={() => setSelectedHistory(history)}
        >
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-gray-50 rounded-lg">
              <MessageCircle className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-medium text-gray-900 truncate">
                  {history.title}
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(history.timestamp).toLocaleDateString()} {new Date(history.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(history.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors"
                      title="删除对话"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-1 text-sm text-gray-600 line-clamp-2 break-all">
                {history.preview}
              </div>
              
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-50 text-xs text-gray-600">
                  {history.messages.length} 条消息
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
