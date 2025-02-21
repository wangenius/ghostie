import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { SettingsManager } from "@/services/settings/SettingsManager";
import { cmd } from "@/utils/shell";
import { cn } from "@/lib/utils";
import { ReactNode, useState } from "react";
import { TbArrowIteration, TbFolder, TbHistory, TbPalette, TbRotate, TbTypography } from "react-icons/tb";

interface SettingItemProps {
    icon: ReactNode;
    title: string;
    description?: string;
    action: ReactNode;
    titleClassName?: string;
}

function SettingItem({ icon, title, description, action, titleClassName }: SettingItemProps) {
    return (
        <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
            <div className="flex items-center gap-3">
                <div className="text-muted-foreground">
                    {icon}
                </div>
                <div>
                    <div className={cn("text-sm text-foreground", titleClassName)}>{title}</div>
                    {description && (
                        <div className="text-xs text-muted-foreground">{description}</div>
                    )}
                </div>
            </div>
            {action}
        </div>
    );
}

function ThemeSettings() {
    const settings = SettingsManager.use();
    const themes = [
        { name: "light", label: "浅色" },
        { name: "dark", label: "深色" }
    ];

    return (
        <SettingItem
            icon={<TbPalette className="w-[18px] h-[18px]" />}
            title="主题设置"
            description={`当前主题: ${settings.theme.label}`}
            action={
                <div className="flex gap-1">
                    {themes.map(theme => (
                        <Button
                            key={theme.name}
                            size="sm"
                            variant={settings.theme.name === theme.name ? "secondary" : "ghost"}
                            onClick={() => SettingsManager.setTheme(theme)}
                        >
                            {theme.label}
                        </Button>
                    ))}
                </div>
            }
        />
    );
}

function FontSettings() {
    const settings = SettingsManager.use();
    const fonts = [
        { name: "siyuan", label: "思源" },
        { name: "harmony", label: "鸿蒙" },
        { name: "default", label: "默认" }
    ];

    return (
        <SettingItem
            icon={<TbTypography className="w-[18px] h-[18px]" />}
            title="字体设置"
            description={`当前字体: ${settings.font.label}`}
            action={
                <div className="flex gap-1">
                    {fonts.map(font => (
                        <Button
                            key={font.name}
                            size="sm"
                            variant={settings.font.name === font.name ? "secondary" : "ghost"}
                            onClick={() => SettingsManager.setFont(font)}
                        >
                            {font.label}
                        </Button>
                    ))}
                </div>
            }
        />
    );
}

function UpdateSettings() {
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
                await cmd.message(`已是最新版本${PACKAGE_VERSION}`, "确认");
            }
        } finally {
            setChecking(false);
        }
    };

    return (
        <SettingItem
            icon={<TbRotate className={`w-[18px] h-[18px] ${checking ? "animate-spin" : ""}`} />}
            title="检查更新"
            description={`当前版本: ${PACKAGE_VERSION}`}
            action={
                <Button
                    onClick={checkUpdate}
                    disabled={checking}
                    variant="primary"
                    size="sm"
                >
                    {checking ? "检查中..." : "检查更新"}
                </Button>
            }
        />
    );
}

function ConfigDirSettings() {
    return (
        <SettingItem
            icon={<TbFolder className="w-[18px] h-[18px]" />}
            title="本地配置文件目录"
            action={
                <Button
                    onClick={() => cmd.invoke("open_config_dir")}
                    variant="ghost"
                    size="sm"
                >
                    打开目录
                </Button>
            }
        />
    );
}

function ReactMaxIterationsSettings() {
    const settings = SettingsManager.use();

    return (
        <SettingItem
            icon={<TbArrowIteration className="w-[18px] h-[18px]" />}
            title="ReActMaxIterations"
            titleClassName="font-bold"
            description={`Agent任务最大迭代次数，当前：${settings.reActMaxIterations}`}
            action={
                <Slider
                    value={[settings.reActMaxIterations]}
                    onValueChange={(value) => {
                        SettingsManager.setReactMaxIterations(value[0]);
                    }}
                    min={5}
                    max={20}
                    step={1}
                    className="w-32"
                />
            }
        />
    );
}

function MaxHistorySettings() {
    const settings = SettingsManager.use();

    return (
        <SettingItem
            icon={<TbHistory className="w-[18px] h-[18px]" />}
            title="MaxHistoryMessageNumber"
            titleClassName="w-full"
            description={`对话的最大上下文消息数量，当前：${settings.maxHistory}`}
            action={
                <Slider
                    value={[settings.maxHistory]}
                    onValueChange={(value) => {
                        SettingsManager.setMaxHistory(value[0]);
                    }}
                    min={20}
                    max={120}
                    step={1}
                    className="w-32"
                />
            }
        />
    );
}

export function GeneralTab() {
    return (
        <div className="space-y-2 p-4">
            <ThemeSettings />
            <FontSettings />
            <UpdateSettings />
            <ConfigDirSettings />
            <MaxHistorySettings />
            <ReactMaxIterationsSettings />

        </div>
    );
}
