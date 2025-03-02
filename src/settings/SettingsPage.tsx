import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { Page } from "@/utils/PageRouter";
import { Echo } from "echo-state";
import {
  TbBox,
  TbDatabase,
  TbFileFunction,
  TbGhost3,
  TbKeyboard,
  TbSettings,
  TbShape3,
} from "react-icons/tb";
import { BotsTab } from "../bot/BotsTab";
import { KnowledgeTab } from "../knowledge/KnowledgeTab";
import { ModelsTab } from "../model/ModelsTab";
import { PluginsTab } from "../plugin/PluginsTab";
import WorkflowsTab from "../workflow/WorkflowsTab";
import { GeneralSettingsPage } from "./GeneralSettingsPage";
import ShortcutsTab from "./ShortcutsTab";

const SETTINGS_NAV_ITEMS = [
  { id: "general", label: "通用", icon: TbSettings },
  { id: "models", label: "大模型", icon: TbBox },
  { id: "bots", label: "机器人", icon: TbGhost3 },
  { id: "plugins", label: "插件库", icon: TbFileFunction },
  { id: "workflows", label: "工作流", icon: TbShape3 },
  { id: "knowledge", label: "知识库", icon: TbDatabase },
  { id: "shortcuts", label: "快捷键", icon: TbKeyboard },
] as const;

type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

const SettingsNav = new Echo<{ activeTab: SettingsTab }>(
  {
    activeTab: SETTINGS_NAV_ITEMS[0].id,
  },
  {
    name: "settings-nav",
  },
);

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

  return (
    <div className="flex flex-col h-full bg-background">
      {/* 标题栏 */}
      <Header
        title="设置"
        close={() => {
          Page.to("main");
        }}
      />

      {/* 主体内容区 */}
      <div className="flex flex-1 gap-8 p-6 pt-4 overflow-hidden">
        {/* 左侧导航 */}
        <div className="w-44 flex flex-col justify-between">
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
