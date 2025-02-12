import { Button } from "@/components/ui/button";
import { SettingsManager } from "@/services/settings/SettingsManager";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import { TbPalette, TbRotate } from "react-icons/tb";

export function GeneralTab() {
    const settings = SettingsManager.use();
    const [checking, setChecking] = useState(false);

    const checkForUpdates = async () => {
        try {
            const hasUpdate = await cmd.invoke<boolean>("check_update");

            if (hasUpdate) {
                await cmd.invoke("install_update");
                await cmd.invoke("relaunch");
            }

            return hasUpdate;
        } catch (error) {
            console.error("更新检查失败:", error);
            return false;
        }
    };

    const checkUpdate = async () => {
        setChecking(true);
        try {
            const hasUpdate = await checkForUpdates();
            if (!hasUpdate) {
                // await message("已是最新版本", { title: "echo" });
            }
        } finally {
            setChecking(false);
        }
    };

    return (
        <div className="space-y-2 p-4">
            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <TbPalette className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                        <div className="text-sm text-foreground">主题设置</div>
                        <div className="text-xs text-muted-foreground">当前主题:
                            <span className="pl-2">{settings.theme.label}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1">
                    {[{ name: "light", label: "浅色" }, { name: "dark", label: "深色" }].map(theme => (
                        <Button
                            key={theme.name}
                            size="sm"
                            variant={settings.theme.name === theme.name ? "secondary" : "ghost"}
                            onClick={() => {
                                SettingsManager.setTheme(theme);
                            }}
                        >
                            {theme.label}
                        </Button>
                    ))}
                </div>
            </div>

            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <TbRotate
                            className={`w-[18px] h-[18px] ${checking ? "animate-spin" : ""}`}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-foreground">检查更新</div>
                        <div className="text-xs text-muted-foreground">当前版本:
                            <span className="pl-2">{PACKAGE_VERSION}</span>
                        </div>
                    </div>
                </div>

                <Button
                    onClick={checkUpdate}
                    disabled={checking}
                    variant="primary"
                    size="sm"
                >
                    {checking ? "检查中..." : "检查更新"}
                </Button>
            </div>
        </div>
    );
}
