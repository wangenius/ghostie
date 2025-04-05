import { memo, useEffect, useRef } from "react";
import { CurrentTalkAgent } from "../MainView";
import { ChatHistory } from "@/model/text/HistoryMessage";
import { MessageItem } from "../components/MessageItem";

// 聊天记录显示组件
export const ChatBox = memo(() => {
  const agent = CurrentTalkAgent.use();
  const list = ChatHistory.use();
  const message = list[agent.engine.model?.historyMessage.id];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 当消息更新时滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [list]);

  if (!message) {
    return null;
  }

  return (
    <div className="px-4 max-w-3xl mx-auto space-y-4 my-4 pb-2">
      {message.list.map((message, index) => (
        <MessageItem key={index} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
});
