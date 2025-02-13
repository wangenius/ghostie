import { Header } from "@/components/custom/Header";
import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { Echo } from "echo-state";
import { TbBox, TbColorSwatch, TbDatabase, TbGhost3, TbSettings } from "react-icons/tb";
import { BotsTab } from "./BotsTab";
import { GeneralTab } from "./GeneralTab";
import { ModelsTab } from "./ModelsTab";
import { PluginsTab } from "./PluginsTab";
import { SpaceTab } from "./SpaceTab";

const SETTINGS_NAV_ITEMS = [
    { id: "general", label: "通用", icon: TbSettings },
    { id: "models", label: "模型", icon: TbBox },
    { id: "bots", label: "助手", icon: TbGhost3 },
    { id: "plugins", label: "插件", icon: TbColorSwatch },
    { id: "space", label: "空间", icon: TbDatabase }
] as const;

type SettingsTab = (typeof SETTINGS_NAV_ITEMS)[number]["id"];

const SettingsNav = new Echo<{ activeTab: SettingsTab }>(
    { activeTab: SETTINGS_NAV_ITEMS[0].id },
    {
        name: "settings-nav",
        sync: true
    }
)


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
            case "space":
                return <SpaceTab />;
            default:
                return <GeneralTab />;
        }
    };


    return (
        <div className="flex flex-col h-full bg-background">
            {/* 标题栏 */}
            <Header title="设置" close={() => {
                cmd.close();

            }} />


            {/* 主体内容区 */}
            <div className="flex flex-1 gap-6 p-6 pt-2 overflow-hidden">
                {/* 左侧导航 */}
                <div className="w-44">
                    <div className="flex flex-col gap-1">
                        {SETTINGS_NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                            <Button
                                key={id}
                                onClick={() => SettingsNav.set({ activeTab: id as SettingsTab })}
                                variant={activeTab === id ? "primary" : "ghost"}
                                className={`flex items-center justify-start gap-2.5 py-2 px-3.5 rounded-lg text-sm transition-all h-10`}
                            >

                                <Icon className="w-4 h-4" />
                                {label}
                            </Button>
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
