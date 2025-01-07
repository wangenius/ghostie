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


/* UI */
export type SettingsTab = "general" | "models" | "bots" | "agents" | "plugins" | "space";

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  repository?: string;
}

export interface PluginPackage {
  metadata: PluginMetadata;
  downloadUrl: string;
  publishedAt: string;
  downloads: number;
  rating: number;
  ratingCount: number;
  screenshots: string[];
  descriptionMd: string;
  changelogMd?: string;
  sha256: string;
  size: number;
}

export interface PluginCategory {
  id: string;
  name: string;
  description: string;
  pluginCount: number;
}

export interface MarketConfig {
  sourceUrl: string;
  name: string;
  description: string;
  official: boolean;
  enabled: boolean;
}

export interface PluginRating {
  pluginId: string;
  userId: string;
  score: number;
  comment?: string;
  createdAt: string;
}

export interface SearchResult {
  total: number;
  page: number;
  perPage: number;
  items: PluginPackage[];
}
