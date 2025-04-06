import { SETTINGS_NAV_ITEMS, SettingsTab } from "@/page/settings/SettingsPage";
import { LogicalSize, Window } from "@tauri-apps/api/window";
import { Echo } from "echo-state";
import { Fragment, ReactNode } from "react";

const PageStore = new Echo<{
  page: "main" | "history" | "settings";
  settingsTab: SettingsTab;
  data: Record<string, any>;
}>({
  page: "main",
  settingsTab: SETTINGS_NAV_ITEMS[0].id,
  data: {},
}).localStorage({ name: "page" });

export const Page = ({
  name,
  component,
}: {
  name: "main" | "history" | "settings";
  component: ReactNode;
}) => {
  const { page } = PageStore.use();
  if (page !== name) return null;
  if (name === "main") {
    Window.getByLabel("main").then((window) => {
      window?.setSize(new LogicalSize(600, 160));
      window?.center();
      window?.setResizable(false);
      window?.setMinSize(new LogicalSize(600, 150));
      window?.setMaxSize(new LogicalSize(600, 150));
    });
  } else {
    Window.getByLabel("main").then((window) => {
      window?.setSize(new LogicalSize(1200, 800));
      window?.center();
      window?.setResizable(true);
    });
  }
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
