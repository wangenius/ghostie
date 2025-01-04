export type View = "list" | "chat" | "settings" | "history";

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface BotInfo {
  type: "bot";
  name: string;
  systemPrompt: string;
  isCurrent?: boolean;
}

export interface AgentInfo {
  type: "agent";
  name: string;
  systemPrompt: string;
  description?: string;
}

export interface ChatItem {
  type: "chat";
  content: string;
}

export type ListItem = BotInfo | AgentInfo | ChatItem;