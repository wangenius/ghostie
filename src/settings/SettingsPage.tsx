import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Page } from "@/utils/PageRouter";
import { Echo } from "echo-state";
import { PiCheck, PiInfo, PiWarning, PiXCircle } from "react-icons/pi";
import {
  TbBox,
  TbDatabase,
  TbGhost3,
  TbKeyboard,
  TbLoader2,
  TbScript,
  TbSettings,
  TbShape3,
} from "react-icons/tb";
import { Toaster } from "sonner";
import { BotsTab } from "../bot/ui/BotsTab";
import { KnowledgeTab } from "../knowledge/KnowledgeTab";
import { ModelsTab } from "../model/ui/ModelsTab";
import { PluginsTab } from "../plugin/PluginsTab";
import WorkflowsTab from "../workflow/WorkflowsTab";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import ShortcutsTab from "./ShortcutsTab";
import { useEffect } from "react";

const SETTINGS_NAV_ITEMS = [
  { id: "general", label: "General", icon: TbSettings },
  { id: "models", label: "Models", icon: TbBox },
  { id: "bots", label: "Bots", icon: TbGhost3 },
  { id: "plugins", label: "Plugins", icon: TbScript },
  { id: "workflows", label: "Workflows", icon: TbShape3 },
  { id: "knowledge", label: "Knowledge", icon: TbDatabase },
  { id: "shortcuts", label: "Shortcuts", icon: TbKeyboard },
] as const;

type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

const SettingsNav = new Echo<{ activeTab: SettingsTab }>({
  activeTab: SETTINGS_NAV_ITEMS[0].id,
}).localStorage({ name: "settings-nav" });

export function SettingsPage() {
  const { activeTab } = SettingsNav.use();
  const renderContent = () => {
    switch (activeTab) {
      case "models":
        return <ModelsTab />;
      case "bots":
        return <BotsTab />;
      case "plugins":
        return <PluginsTab />;
      case "knowledge":
        return <KnowledgeTab />;
      case "workflows":
        return <WorkflowsTab />;
      case "shortcuts":
        return <ShortcutsTab />;
      default:
        return <GeneralSettingsPage />;
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        Page.to("main");
      }
      if (e.altKey) {
        switch (e.key) {
          case "1":
            SettingsNav.set({ activeTab: "general" });
            break;
          case "2":
            SettingsNav.set({ activeTab: "models" });
            break;
          case "3":
            SettingsNav.set({ activeTab: "bots" });
            break;
          case "4":
            SettingsNav.set({ activeTab: "plugins" });
            break;
          case "5":
            SettingsNav.set({ activeTab: "workflows" });
            break;
          case "6":
            SettingsNav.set({ activeTab: "knowledge" });
            break;
          case "7":
            SettingsNav.set({ activeTab: "shortcuts" });
            break;
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full bg-background">
      <Toaster
        visibleToasts={2}
        expand
        richColors
        icons={{
          success: <PiCheck className="text-green-500" />,
          info: <PiInfo className="text-blue-500" />,
          warning: <PiWarning className="text-yellow-500" />,
          error: <PiXCircle className="text-red-500" />,
          loading: <TbLoader2 className="text-gray-500" />,
        }}
      />
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
                onClick={() =>
                  SettingsNav.set({ activeTab: id as SettingsTab })
                }
                variant="ghost"
                className={`group relative flex items-center justify-start gap-3 py-2 px-4 h-12 text-sm transition-all duration-200
                  ${
                    activeTab === id
                      ? "text-primary font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-5 before:bg-primary before:rounded-full"
                      : "text-muted-foreground hover:text-foreground"
                  }
                  hover:bg-transparent
                `}
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-200
                  ${
                    activeTab === id
                      ? "bg-primary/10"
                      : "bg-muted/50 group-hover:bg-muted"
                  }`}
                >
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      activeTab === id
                        ? "text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  />
                </div>
                <span className="flex-1">{label}</span>
                {activeTab === id && (
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
