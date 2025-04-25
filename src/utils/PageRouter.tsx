import { Echo } from "echo-state";
import { Fragment, ReactNode } from "react";
import {
  TbBook2,
  TbBox,
  TbClock,
  TbDatabase,
  TbMessage,
  TbPlanet,
  TbScript,
  TbServer,
  TbSettings,
  TbShape3,
} from "react-icons/tb";

export type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

export const SETTINGS_NAV_ITEMS = [
  { id: "agents", label: "Agents", icon: TbMessage },
  { id: "schedules", label: "Schedules", icon: TbClock },
  { id: "market", label: "Market", icon: TbPlanet },
  { id: "database", label: "Database", icon: TbDatabase },
  { id: "models", label: "Models", icon: TbBox },
  { id: "plugins", label: "Plugins", icon: TbScript },
  { id: "workflows", label: "Workflows", icon: TbShape3 },
  { id: "knowledge", label: "Knowledge", icon: TbBook2 },
  { id: "mcp", label: "MCP", icon: TbServer },
  { id: "general", label: "General", icon: TbSettings },
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
