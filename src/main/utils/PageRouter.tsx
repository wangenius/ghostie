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
import { create } from "zustand";
import { SETTINGS_NAV_ITEMS } from "@common/config/nav";
import { cmd } from "./shell";

export type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

// 为导航项添加图标映射
export const NAV_ICONS = {
  agents: TbMessageCircle,
  market: TbPlanet,
  plugins: TbScript,
  workflows: TbShape3,
  mcp: TbServer,
  database: TbDatabase,
  knowledge: TbBook2,
  resources: TbCheese,
  models: TbBox,
  schedules: TbClock,
  general: TbSettings,
} as const;

interface PageState {
  settingsTab: SettingsTab;
  openTabs: SettingsTab[];
  data: Record<string, any>;
}

const PageStore = new Echo<PageState>({
  settingsTab: SETTINGS_NAV_ITEMS[0].id,
  openTabs: [SETTINGS_NAV_ITEMS[0].id],
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
  PageStore.set((prev) => {
    // 如果标签页不存在，则添加到打开的标签页列表中
    if (!prev.openTabs.includes(settings)) {
      return {
        ...prev,
        page: "settings",
        settingsTab: settings,
        openTabs: [...prev.openTabs, settings],
      };
    }
    return {
      ...prev,
      page: "settings",
      settingsTab: settings,
    };
  });
};

Page.closeTab = (tabId: SettingsTab) => {
  PageStore.set((prev) => {
    const newOpenTabs = prev.openTabs.filter((id) => id !== tabId);
    // 如果关闭的是当前标签页，则切换到最后一个标签页
    if (tabId === prev.settingsTab && newOpenTabs.length > 0) {
      return {
        ...prev,
        openTabs: newOpenTabs,
        settingsTab: newOpenTabs[newOpenTabs.length - 1],
      };
    }
    return {
      ...prev,
      openTabs: newOpenTabs,
    };
  });
};

Page.use = PageStore.use.bind(PageStore);

// 监听菜单切换事件
cmd.listen("switch-tab", ({ payload }) => {
    Page.settings(payload as SettingsTab);
});
