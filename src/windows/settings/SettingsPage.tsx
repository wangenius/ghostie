import { useState } from "react";
import { TbBolt, TbColorSwatch, TbDatabase, TbSettings, TbUsers, TbX } from "react-icons/tb";
import { AgentsTab } from "./AgentsTab";
import { BotsTab } from "./BotsTab";
import { GeneralTab } from "./GeneralTab";
import { ModelsTab } from "./ModelsTab";
import { PluginsTab } from "./PluginsTab";
import { SpaceTab } from "./SpaceTab";
import { cmd } from "@/utils/shell";

const SETTINGS_NAV_ITEMS = [
    { id: "general", label: "通用", icon: TbSettings },
    { id: "models", label: "模型", icon: TbDatabase },
    { id: "bots", label: "机器人", icon: TbBolt },
    { id: "agents", label: "代理", icon: TbUsers },
    { id: "plugins", label: "插件", icon: TbColorSwatch },
    { id: "space", label: "空间", icon: TbDatabase }
] as const;

type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>("general");

    const renderContent = () => {
        switch (activeTab) {
            case "models":
                return <ModelsTab />;
            case "bots":
                return <BotsTab />;
            case "agents":
                return <AgentsTab />;
            case "plugins":
                return <PluginsTab />;
            case "space":
                return <SpaceTab />;
            default:
                return <GeneralTab />;
        }
    };


    return (
        <div className="flex flex-col h-full bg-background">
            {/* 标题栏 */}
            <div className="flex draggable justify-end items-center p-3">
                <span onClick={() => cmd.close()} className="btn">
                    <TbX className="w-4 h-4" />
                </span>
            </div>

            {/* 主体内容区 */}
            <div className="flex flex-1 gap-6 p-6 pt-2 overflow-hidden">
                {/* 左侧导航 */}
                <div className="w-44">
                    <div className="flex flex-col gap-1">
                        {SETTINGS_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id as SettingsTab)}
                                className={`flex items-center gap-2.5 py-2 px-3.5 rounded-lg text-sm transition-all ${activeTab === id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 右侧内容 */}
                <div className="flex-1 min-w-0 overflow-auto rounded-xl bg-card/30">
                    <div className="px-6">{renderContent()}</div>
                </div>
            </div>
        </div>
    );
}
