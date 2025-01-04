import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Clock, Trash2 } from "lucide-react";

interface ChatHistory {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
}

export function HistoryView() {
  const [histories, setHistories] = useState<ChatHistory[]>([]);

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

  return (
    <div className="space-y-4">
      {histories.map((history) => (
        <div
          key={history.id}
          className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {history.title}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {new Date(history.timestamp).toLocaleString()}
              </div>
              <div className="mt-2 text-sm text-gray-600 line-clamp-2">
                {history.preview}
              </div>
            </div>
            <div className="ml-4 flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => handleDelete(history.id)}
                className="p-1.5 rounded-md hover:bg-white text-gray-400 hover:text-red-600 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
