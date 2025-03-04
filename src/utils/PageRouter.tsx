import { LogicalSize, Window } from "@tauri-apps/api/window";
import { Echo } from "echo-state";
import { Fragment, ReactNode } from "react";

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
      window?.setSize(new LogicalSize(600, 400));
      window?.center();
      window?.setResizable(false);
      window?.setMinSize(new LogicalSize(600, 400));
      window?.setMaxSize(new LogicalSize(600, 400));
    });
  } else {
    Window.getByLabel("main").then((window) => {
      window?.setSize(new LogicalSize(1200, 800));
      window?.center();
      window?.setMinSize(new LogicalSize(1200, 800));
      window?.setResizable(true);
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
