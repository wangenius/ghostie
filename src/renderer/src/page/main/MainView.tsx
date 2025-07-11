import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_ICONS, Page, SettingsTab } from "@/utils/PageRouter";
import { SETTINGS_NAV_ITEMS } from "@common/config/nav";
import { TbX } from "react-icons/tb";
import { AgentsTab } from "../agent/AgentsTab";
import { DatabaseTab } from "../database/DatabaseTab";
import { KnowledgeTab } from "../knowledge/KnowledgeTab";
import { MarketTab } from "../market/MarketTab";
import { MCPTab } from "../mcp/MCPManagerTab";
import { ModelsTab } from "../model/ModelsTab";
import { ResourcesTab } from "../resource/ResourcesTab";
import { SchedulesTab } from "../schedule/SchedulesTab";
import { GeneralSettingsPage } from "../settings/GeneralSettingsPage";
import { ToolkitTab } from "../toolkit/ToolkitTab";
import WorkflowsTab from "../workflow/WorkflowsTab";

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
        return <ToolkitTab />;
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

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex overflow-x-auto draggable h-10 justify-end">
        <div className="w-[70px] flex-shrink-0" />{" "}
        {/* macOS 窗口按钮预留空间 */}
        <div className="flex-1 draggable" /> {/* 中间空白可拖动区域 */}
        <div className="flex no-drag">
          {SETTINGS_NAV_ITEMS.map((item) => {
            const Icon = NAV_ICONS[item.id];
            return (
              <div
                key={item.id}
                onClick={() => Page.settings(item.id as SettingsTab)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 border-b-2 border-transparent hover:bg-muted/50 group",
                  settingsTab === item.id && "border-primary text-primary",
                )}
              >
                <div className="flex items-center gap-2 cursor-pointer select-none">
                  <Icon className="size-4" />
                  {settingsTab === item.id && (
                    <span className="text-xs font-medium">{item.label}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <main className="flex-1 overflow-hidden p-2">
        <div className="h-full overflow-auto">{renderContent()}</div>
      </main>
    </div>
  );
}
