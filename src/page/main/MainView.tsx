import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Page, SETTINGS_NAV_ITEMS, SettingsTab } from "@/utils/PageRouter";
import { Window } from "@tauri-apps/api/window";
import { useCallback } from "react";
import { TbX } from "react-icons/tb";
import { AgentsTab } from "../agent/AgentsTab";
import { DatabaseTab } from "../database/DatabaseTab";
import { KnowledgeTab } from "../knowledge/KnowledgeTab";
import { MarketTab } from "../market/MarketTab";
import { MCPTab } from "../mcp/MCPManagerTab";
import { ModelsTab } from "../model/ModelsTab";
import { PluginsTab } from "../plugins/PluginsTab";
import { SchedulesTab } from "../schedule/SchedulesTab";
import { GeneralSettingsPage } from "../settings/GeneralSettingsPage";
import WorkflowsTab from "../workflow/WorkflowsTab";
import { ResourcesTab } from "../resource/ResourcesTab";

/* 主界面 */
export function MainView() {
  const { settingsTab } = Page.use();

  const renderContent = () => {
    switch (settingsTab) {
      case "agents":
        return <AgentsTab />;
      case "market":
        return <MarketTab />;
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
      case "resources":
        return <ResourcesTab />;
      default:
        return <GeneralSettingsPage />;
    }
  };

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
          {SETTINGS_NAV_ITEMS.map(({ id, icon: Icon, divider }) => {
            return (
              <div key={id} className="space-y-1">
                <Button
                  onClick={() => Page.settings(id as SettingsTab)}
                  variant="ghost"
                  className={cn(
                    `group relative flex items-center justify-center gap-3 p-1 size-10 text-sm transition-all duration-200
                    rounded-[11px] hover:bg-muted
                  `,
                    settingsTab === id && "bg-primary hover:bg-primary/90",
                  )}
                >
                  <Icon
                    className={`size-5 transition-colors ${
                      settingsTab === id
                        ? "text-muted"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                </Button>
                {divider ? (
                  <div className="h-[1px] bg-muted-foreground/50 mx-2"></div>
                ) : null}
              </div>
            );
          })}
        </div>
        <div className="flex-1 min-w-0 overflow-hidden">{renderContent()}</div>
      </main>
    </div>
  );
}
