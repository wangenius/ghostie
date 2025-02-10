import { useEffect, useState } from "react";
import { TbChevronRight, TbBulb, TbMoon, TbPower, TbRotate, TbSun } from "react-icons/tb";

interface Settings {
    theme: "light" | "dark" | "system";
    language: "zh-CN" | "en-US";
    shortcut: string;
    autoUpdate: boolean;
    autoLaunch: boolean;
}

// 主题持久化 key
const THEME_KEY = "app-theme";

export function GeneralTab() {
    const [settings, setSettings] = useState<Settings>({
        theme: (localStorage.getItem(THEME_KEY) as Settings["theme"]) || "system",
        language: "zh-CN",
        shortcut: "Alt+Space",
        autoUpdate: true,
        autoLaunch: false
    });

    const [checking, setChecking] = useState(false);
    const [version, setVersion] = useState<string>("");

    // 初始化时获取版本号
    useEffect(() => {
        // getVersion()
        //     .then((version) => {
        //         setVersion(version);
        //     })
        //     .catch(console.error);
    }, []);

    // 初始化时获取自启动状态
    useEffect(() => {
        // isEnabled()
        //     .then((enabled) => {
        //         setSettings((prev) => ({ ...prev, autoLaunch: enabled }));
        //     	})
        //     .catch(console.error);
    }, []);

    // 处理自启动状态变更
    const handleAutoLaunchChange = async (checked: boolean) => {
        try {
            // if (checked) {
            //     await enable();
            // } else {
            //     await disable();
            // }

            setSettings((prev) => ({ ...prev, autoLaunch: checked }));
        } catch (error) {
            console.error("设置自启动失败:", error);
            // 恢复原来的状态
            setSettings((prev) => ({ ...prev, autoLaunch: !checked }));
        }
    };

    const checkForUpdates = async () => {
        try {
            // const hasUpdate = await invoke<boolean>("check_update");

            // if (hasUpdate) {
            //     // 如果有更新，安装并重启
            //     await invoke("install_update");
            //     await relaunch();
            // }

            // return hasUpdate;
            return false;
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

    // 监听系统主题变化并应用主题
    useEffect(() => {
        const applyTheme = (theme: "light" | "dark" | "system") => {
            // 保存到本地存储
            localStorage.setItem(THEME_KEY, theme);

            // 根据主题设置应用类名
            if (theme === "system") {
                const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                document.documentElement.classList.toggle("dark", isDark);
            } else {
                document.documentElement.classList.toggle("dark", theme === "dark");
            }
        };

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = () => {
            if (settings.theme === "system") {
                applyTheme("system");
            }
        };

        applyTheme(settings.theme);
        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [settings.theme]);

    const toggleTheme = () => {
        const themeMap = {
            light: "dark",
            dark: "system",
            system: "light"
        } as const;
        setSettings({ ...settings, theme: themeMap[settings.theme] });
    };

    const getThemeText = () => {
        const themeTexts = {
            light: "浅色模式",
            dark: "深色模式",
            system: "跟随系统"
        };
        return themeTexts[settings.theme];
    };

    return (
        <div className="space-y-1">
            <div
                onClick={toggleTheme}
                className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg cursor-pointer hover:bg-secondary"
            >
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        {settings.theme === "light" ? (
                            <TbSun className="w-[18px] h-[18px]" />
                        ) : settings.theme === "dark" ? (
                            <TbMoon className="w-[18px] h-[18px]" />
                        ) : (
                            <div className="w-[18px] h-[18px] flex">
                                <TbBulb className="w-[18px] h-[18px] absolute" />
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="text-sm text-foreground">外观</div>
                        <div className="text-xs text-muted-foreground">{getThemeText()}</div>
                    </div>
                </div>
                <TbChevronRight className="w-4 h-4 text-muted-foreground" />
            </div>

            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <TbPower className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                        <div className="text-sm text-foreground">开机自启动</div>
                        <div className="text-xs text-muted-foreground">启动系统时自动运行</div>
                    </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                    <input
                        type="checkbox"
                        checked={settings.autoLaunch}
                        onChange={(e) => handleAutoLaunchChange(e.target.checked)}
                        className="sr-only peer"
                    />
                    <div className="w-9 h-5 rounded-full bg-muted peer-checked:bg-primary after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-background after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                </label>
            </div>

            <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg hover:bg-secondary">
                <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">
                        <TbRotate
                            className={`w-[18px] h-[18px] ${checking ? "animate-spin" : ""}`}
                        />
                    </div>
                    <div>
                        <div className="text-sm text-foreground">检查更新</div>
                        <div className="text-xs text-muted-foreground">当前版本: v{version}</div>
                    </div>
                </div>
                <button
                    onClick={checkUpdate}
                    disabled={checking}
                    className="px-3 py-1 text-sm text-primary-foreground bg-primary rounded-md hover:opacity-90 disabled:opacity-50"
                >
                    {checking ? "检查中..." : "检查更新"}
                </button>
            </div>
        </div>
    );
}
