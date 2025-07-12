import { Echo } from "echo-state";
import { useEffect } from "react";
import {
  TbBook2,
  TbBox,
  TbCheese,
  TbDatabase,
  TbMessageCircle,
  TbScript,
  TbServer,
  TbSettings,
  TbShape3,
} from "react-icons/tb";
import { AgentsTab } from "./page/agent/AgentsTab";
import { KnowledgeTab } from "./page/knowledge/KnowledgeTab";
import { MarketTab } from "./page/market/MarketTab";
import { MCPTab } from "./page/mcp/MCPManagerTab";
import { ModelsTab } from "./page/model/ModelsTab";
import { ResourcesTab } from "./page/resource/ResourcesTab";
import { SchedulesTab } from "./page/schedule/SchedulesTab";
import { GeneralSettingsPage } from "./page/settings/GeneralSettingsPage";
import TeamsTab from "./page/team/TeamsTab";
import { ToolkitTab } from "./page/toolkit/ToolkitTab";
import WorkflowsTab from "./page/workflow/WorkflowsTab";

export const SETTINGS_NAV_ITEMS = [
  { id: "agents", label: "Agents", icon: TbMessageCircle, divider: false },
  // { id: "market", label: "Market", icon: TbPlanet, divider: true },
  { id: "plugins", label: "Plugins", icon: TbScript, divider: false },
  { id: "workflows", label: "Workflows", icon: TbShape3, divider: false },
  { id: "mcp", label: "MCP", icon: TbServer, divider: true },
  { id: "database", label: "Database", icon: TbDatabase, divider: false },
  { id: "knowledge", label: "Knowledge", icon: TbBook2, divider: false },
  { id: "resources", label: "Resources", icon: TbCheese, divider: true },
  { id: "models", label: "Models", icon: TbBox, divider: false },
  { id: "general", label: "General", icon: TbSettings, divider: false },
] as const;

export const ActiveTab = new Echo<
  | "chat"
  | "agents"
  | "settings"
  | "market"
  | "schedules"
  | "teams"
  | "models"
  | "plugins"
  | "knowledge"
  | "workflows"
  | "database"
  | "mcp"
  | "resources"
>("chat").localStorage({
  name: "activeTab",
});

/* 主应用,提供路由 */
function App() {
  const activeTab = ActiveTab.use();
  const renderContent = () => {
    switch (activeTab) {
      case "agents":
        return <AgentsTab />;
      case "market":
        return <MarketTab />;
      case "schedules":
        return <SchedulesTab />;
      case "teams":
        return <TeamsTab />;
      case "models":
        return <ModelsTab />;
      case "plugins":
        return <ToolkitTab />;
      case "knowledge":
        return <KnowledgeTab />;
      case "workflows":
        return <WorkflowsTab />;
      case "mcp":
        return <MCPTab />;
      case "resources":
        return <ResourcesTab />;
      default:
        return <GeneralSettingsPage />;
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Alt") {
        e.preventDefault();
      }
      if (e.key.toLowerCase() === "r" && e.ctrlKey) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <main id="app" className="flex-1 overflow-hidden h-screen flex gap-3">
      {renderContent()}
    </main>
  );
}

export default App;
