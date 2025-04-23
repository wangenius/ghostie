import { SETTINGS_NAV_ITEMS, SettingsTab } from "@/page/main/MainView";
import { Echo } from "echo-state";
import { Fragment, ReactNode } from "react";

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

Page.to = (name: "main" | "history" | "settings") => {
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
