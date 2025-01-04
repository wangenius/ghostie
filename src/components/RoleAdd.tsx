import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  embedded?: boolean;
}

export function RoleAdd({ isOpen, onClose, onSuccess, embedded = false }: Props) {
  const [name, setName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await invoke("add_bot", { name, systemPrompt });
      onSuccess();
      onClose();
      setName("");
      setSystemPrompt("");
    } catch (error) {
      console.error("添加 bot 失败:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <>
      {/* 头部搜索样式区域 */}
      <div className="pt-2 px-4">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full pl-3 text-sm pr-24 h-10 bg-transparent text-gray-800 outline-none placeholder:text-gray-400"
            placeholder="输入 Bot 名称"
          />

          <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-all duration-200 active:scale-95"
            >
              <X className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      {/* 系统提示词区域 */}
      <div className="px-4 mt-2">
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          className="w-full px-3 py-2 text-sm bg-gray-50 rounded-lg text-gray-800 outline-none placeholder:text-gray-400 min-h-[120px] resize-none"
          placeholder="输入系统提示词"
        />
      </div>

      {/* 底部按钮区域 */}
      <div className="px-4 py-3 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!name || !systemPrompt || isSubmitting}
          className="px-4 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "创建中..." : "创建"}
        </button>
      </div>
    </>
  );

  if (embedded) {
    return <div className="bg-white w-full rounded-lg">{content}</div>;
  }

  return (
    <div className="fixed inset-0 flex items-start justify-center">
      <div className="bg-white w-full max-w-xl mt-16 rounded-lg shadow-xl">
        {content}
      </div>
    </div>
  );
}