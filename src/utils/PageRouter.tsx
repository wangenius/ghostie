import { Echo } from "echo-state";
import { Fragment, ReactNode } from "react";
import { Window } from "@tauri-apps/api/window";

const PageStore = new Echo<{ page: string; data: Record<string, any> }>(
  { page: "main", data: {} },
  {
    name: "page",
  },
);

export const Page = ({
  name,
  component,
}: {
  name: string;
  component: ReactNode;
}) => {
  const { page } = PageStore.use();
  if (page !== name) return null;
  if (name === "main") {
    Window.getByLabel("main").then((window) => {
      if (window?.isMaximized()) {
        window.toggleMaximize();
      }
    });
  } else {
    Window.getByLabel("main").then((window) => {
      window?.maximize();
    });
  }

  return <Fragment>{component}</Fragment>;
};

Page.to = (name: string, data?: any) => {
  PageStore.set((prev) => ({
    page: name,
    data: {
      ...prev.data,
      ...data,
    },
  }));
};
