import { Echo } from "echo-state";
import { Fragment, ReactNode } from "react";
import {
  TbBook2,
  TbBox,
  TbCheese,
  TbClock,
  TbDatabase,
  TbMessageCircle,
  TbMessages,
  TbPlanet,
  TbScript,
  TbServer,
  TbSettings,
  TbShape3,
} from "react-icons/tb";

export type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

export const SETTINGS_NAV_ITEMS = [
  { id: "agents", label: "Agents", icon: TbMessageCircle, divider: false },
  { id: "teams", label: "Teams", icon: TbMessages, divider: false },
  { id: "market", label: "Market", icon: TbPlanet, divider: true },
  { id: "plugins", label: "Plugins", icon: TbScript, divider: false },
  { id: "workflows", label: "Workflows", icon: TbShape3, divider: false },
  { id: "mcp", label: "MCP", icon: TbServer, divider: true },
  { id: "database", label: "Database", icon: TbDatabase, divider: false },
  { id: "knowledge", label: "Knowledge", icon: TbBook2, divider: false },
  { id: "resources", label: "Resources", icon: TbCheese, divider: true },
  { id: "models", label: "Models", icon: TbBox, divider: false },
  { id: "schedules", label: "Schedules", icon: TbClock, divider: false },
  { id: "general", label: "General", icon: TbSettings, divider: false },
] as const;
const PageStore = new Echo<{
  settingsTab: SettingsTab;
  data: Record<string, any>;
}>({
  settingsTab: SETTINGS_NAV_ITEMS[0].id,
  data: {},
}).localStorage({ name: "page" });

export const Page = ({ component }: { component: ReactNode }) => {
  return <Fragment>{component}</Fragment>;
};

Page.to = (name: "history" | "settings") => {
  PageStore.set((prev) => ({
    ...prev,
    page: name,
  }));
};

Page.settings = (settings: SettingsTab) => {
  PageStore.set((prev) => ({
    ...prev,
    page: "settings",
    settingsTab: settings,
  }));
};

Page.use = PageStore.use.bind(PageStore);
