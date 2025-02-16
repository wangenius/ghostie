import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SettingsManager } from "@/services/settings/SettingsManager";
import { cmd } from "@/utils/shell";
import { useState } from "react";
import { TbArrowIteration, TbFolder, TbPalette, TbRotate, TbTypography } from "react-icons/tb";

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
                // await message("已是最新版本", { title: "ghostie" });
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
                        <TbTypography
                            className={`w-[18px] h-[18px]`}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-foreground">字体设置</div>
                        <div className="text-xs text-muted-foreground">当前字体:
                            <span className="pl-2">{settings.font.label}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-1">
                    {[{ name: "siyuan", label: "思源" }, { name: "harmony", label: "鸿蒙" }, { name: "default", label: "默认" }].map(font => (
                        <Button
                            key={font.name}
                            size="sm"
                            variant={settings.font.name === font.name ? "secondary" : "ghost"}
                            onClick={() => {
                                SettingsManager.setFont(font);
                            }}
                        >
                            {font.label}
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

            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <TbFolder
                            className={`w-[18px] h-[18px]`}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-foreground">本地配置文件目录</div>

                    </div>
                </div>

                <Button
                    onClick={() => {
                        cmd.invoke("open_config_dir");
                    }}
                    variant="ghost"
                    size="sm"
                >
                    打开目录
                </Button>
            </div>
            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <TbArrowIteration
                            className={`w-[18px] h-[18px]`}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-foreground font-bold">ReActMaxIterations</div>
                        <div className="text-xs text-muted-foreground">
                            <span >助手在执行Agent任务时，最大迭代次数。</span>
                        </div>
                    </div>
                </div>
                <Select
                    value={settings.reActMaxIterations.toString()}
                    onValueChange={(value) => {
                        SettingsManager.setReactMaxIterations(Number(value));
                    }}
                >
                    <SelectTrigger className="w-16">
                        <SelectValue placeholder="请选择" />
                    </SelectTrigger>
                    <SelectContent align="end" className="h-64">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20].map(value => (
                            <SelectItem key={value} value={value.toString()}>
                                {value}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
