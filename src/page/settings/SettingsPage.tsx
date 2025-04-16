import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Page } from "@/utils/PageRouter";
import { useEffect } from "react";
import {
  TbBox,
  TbDatabase,
  TbGhost3,
  TbKeyboard,
  TbScript,
  TbServer,
  TbSettings,
  TbShape3,
} from "react-icons/tb";
import { AgentsTab } from "../agent/AgentsTab";
import { KnowledgeTab } from "../knowledge/KnowledgeTab";
import { MCPTab } from "../mcp/MCPManagerTab";
import { ModelsTab } from "../model/ModelsTab";
import { PluginsTab } from "../plugins/PluginsTab";
import WorkflowsTab from "../workflow/WorkflowsTab";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import ShortcutsTab from "./ShortcutsTab";

export const SETTINGS_NAV_ITEMS = [
  { id: "general", label: "General", icon: TbSettings },
  { id: "models", label: "Models", icon: TbBox },
  { id: "agents", label: "Agents", icon: TbGhost3 },
  { id: "plugins", label: "Plugins", icon: TbScript },
  { id: "workflows", label: "Workflows", icon: TbShape3 },
  { id: "knowledge", label: "Knowledge", icon: TbDatabase },
  { id: "mcp", label: "MCP", icon: TbServer },
  { id: "shortcuts", label: "Shortcuts", icon: TbKeyboard },
] as const;

export type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

export function SettingsPage() {
  const { settingsTab } = Page.use();
  const renderContent = () => {
    switch (settingsTab) {
      case "models":
        return <ModelsTab />;
      case "agents":
        return <AgentsTab />;
      case "plugins":
        return <PluginsTab />;
      case "knowledge":
        return <KnowledgeTab />;
      case "workflows":
        return <WorkflowsTab />;
      case "shortcuts":
        return <ShortcutsTab />;
      case "mcp":
        return <MCPTab />;
      default:
        return <GeneralSettingsPage />;
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === "escape") {
        e.preventDefault();
        e.stopPropagation();
        Page.to("main");
      }
      if (e.altKey) {
        switch (e.key) {
          case "1":
            Page.settings("general");
            break;
          case "2":
            Page.settings("models");
            break;
          case "3":
            Page.settings("agents");
            break;
          case "4":
            Page.settings("plugins");
            break;
          case "5":
            Page.settings("workflows");
            break;
          case "6":
            Page.settings("knowledge");
            break;
          case "7":
            Page.settings("mcp");
            break;
          case "8":
            Page.settings("shortcuts");
            break;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 标题栏 */}
      <Header
        title="Settings"
        close={() => {
          Page.to("main");
        }}
      />

      {/* 主体内容区 */}
      <div className="flex flex-1 gap-8 p-6 pt-4 overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-48 flex flex-col justify-between">
          <div className="flex flex-col space-y-0.5">
            {SETTINGS_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
              <Button
                key={id}
                onClick={() => Page.settings(id as SettingsTab)}
                variant="ghost"
                className={`group relative flex items-center justify-start gap-3 py-2 px-4 h-12 text-sm transition-all duration-200
                  ${
                    settingsTab === id
                      ? "text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-full"
                      : "text-muted-foreground hover:text-foreground"
                  }
                  hover:bg-transparent
                `}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
                  ${
                    settingsTab === id
                      ? "bg-primary/10"
                      : "bg-muted/50 group-hover:bg-muted"
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      settingsTab === id
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                </div>
                <span className="flex-1">{label}</span>
                {settingsTab === id && (
                  <div className="absolute inset-0 bg-primary/5 rounded-lg" />
                )}
              </Button>
            ))}
          </div>
        </div>

        {/* 右侧内容 */}
        <div className="flex-1 min-w-0 overflow-hidden">{renderContent()}</div>
      </div>
    </div>
  );
}
