import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChatHistory } from "@/model/chat/Message";
import { Page } from "@/utils/PageRouter";
import { Window } from "@tauri-apps/api/window";
import { useCallback, useEffect, useRef } from "react";
import {
  TbBook2,
  TbBox,
  TbClock,
  TbDatabase,
  TbMessage,
  TbScript,
  TbServer,
  TbSettings,
  TbShape3,
  TbX,
} from "react-icons/tb";
import { AgentsTab } from "../agent/AgentsTab";
import { KnowledgeTab } from "../knowledge/KnowledgeTab";
import { MCPTab } from "../mcp/MCPManagerTab";
import { ModelsTab } from "../model/ModelsTab";
import { PluginsTab } from "../plugins/PluginsTab";
import { GeneralSettingsPage } from "../settings/GeneralSettingsPage";
import WorkflowsTab from "../workflow/WorkflowsTab";
import { DatabaseTab } from "../database/Database";
import { SchedulesTab } from "../schedule/SchedulesTab";

export type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

export const SETTINGS_NAV_ITEMS = [
  { id: "agents", label: "Agents", icon: TbMessage },
  { id: "schedules", label: "Schedules", icon: TbClock },
  { id: "database", label: "Database", icon: TbDatabase },
  { id: "models", label: "Models", icon: TbBox },
  { id: "plugins", label: "Plugins", icon: TbScript },
  { id: "workflows", label: "Workflows", icon: TbShape3 },
  { id: "knowledge", label: "Knowledge", icon: TbBook2 },
  { id: "mcp", label: "MCP", icon: TbServer },
  { id: "general", label: "General", icon: TbSettings },
] as const;

/* 主界面 */
export function MainView() {
  const { settingsTab } = Page.use();
  const list = ChatHistory.use();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const renderContent = () => {
    switch (settingsTab) {
      case "agents":
        return <AgentsTab />;
      case "schedules":
        return <SchedulesTab />;
      case "models":
        return <ModelsTab />;
      case "plugins":
        return <PluginsTab />;
      case "knowledge":
        return <KnowledgeTab />;
      case "workflows":
        return <WorkflowsTab />;
      case "database":
        return <DatabaseTab />;
      case "mcp":
        return <MCPTab />;
      default:
        return <GeneralSettingsPage />;
    }
  };

  // 当消息更新时滚动到底部
  useEffect(() => {
    if (!messagesContainerRef.current) return;

    const container = messagesContainerRef.current;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      100;

    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [list]);

  const handleCloseClick = useCallback(() => {
    Window.getByLabel("main").then((window) => {
      window?.hide();
    });
  }, []);

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="px-1.5 draggable m-full flex items-center justify-between h-10">
        <span className="text-xs pl-2 text-muted-foreground">
          <img src="/icon.png" className="w-6 h-6" />
        </span>
        <Button
          size={"icon"}
          className="rounded-[8px]"
          onClick={handleCloseClick}
        >
          <TbX className="h-4 w-4" />
        </Button>
      </div>
      <main className="flex-1 overflow-hidden flex justify-between p-3 pt-0 gap-3">
        <div className="flex flex-col space-y-1">
          {SETTINGS_NAV_ITEMS.map(({ id, icon: Icon }) => (
            <Button
              key={id}
              onClick={() => Page.settings(id as SettingsTab)}
              variant="ghost"
              className={cn(
                `group relative flex items-center justify-center gap-3 p-1 size-10 text-sm transition-all duration-200
                    rounded-sm hover:bg-muted
                  `,
                settingsTab === id && "bg-muted-foreground/10",
              )}
            >
              <Icon
                className={`size-5 transition-colors ${
                  settingsTab === id
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                }`}
              />
            </Button>
          ))}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">{renderContent()}</div>
      </main>
    </div>
  );
}
