import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { cmd } from "@/utils/shell";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";
import { useEffect, useState } from "react";
import {
  TbAutomation,
  TbFolder,
  TbFrustum,
  TbLoader2,
  TbNetwork,
  TbPalette,
  TbRotate,
  TbTypography,
} from "react-icons/tb";
import { toast } from "sonner";
import { SettingsManager } from "@/settings/SettingsManager";
import { SettingItem } from "./SettingItem";

export function ThemeSettings() {
  const settings = SettingsManager.use();
  const themes = [
    { name: "light", label: "Light" },
    { name: "dark", label: "Dark" },
  ];

  return (
    <SettingItem
      icon={<TbPalette className="w-[18px] h-[18px]" />}
      title="Theme"
      description={`Current theme: ${settings.theme.label}`}
      action={
        <div className="flex gap-1">
          <DrawerSelector
            value={[settings.theme]}
            items={themes.map((theme) => ({
              label: theme.label,
              value: theme,
            }))}
            onSelect={(value) => SettingsManager.setTheme(value[0])}
          />
        </div>
      }
    />
  );
}

export function FontSettings() {
  const settings = SettingsManager.use();
  const fonts = [
    { name: "default", label: "default" },
    { name: "mono", label: "jetbrains" },
  ];

  return (
    <SettingItem
      icon={<TbTypography className="w-[18px] h-[18px]" />}
      title="Font"
      description={`Current font: ${settings.font.label}`}
      action={
        <div className="flex gap-1">
          <DrawerSelector
            value={[settings.font]}
            items={fonts.map((font) => ({
              label: font.label,
              value: font,
            }))}
            onSelect={(value) => SettingsManager.setFont(value[0])}
          />
        </div>
      }
    />
  );
}

const NodeInstallDialog = ({ checkNode }: { checkNode: () => void }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [installLog, setInstallLog] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const setupListeners = async () => {
      await cmd.listen(
        "node_install_progress",
        (event: { payload: string }) => {
          setInstallLog((prev) => [...prev, event.payload]);
          setProgress((prev) => Math.min(prev + 10, 99));
        },
      );
    };

    setupListeners();
  }, []);

  const installDeno = async () => {
    try {
      setIsInstalling(true);
      setInstallLog([]);
      setProgress(10); // 开始安装
      const success = await cmd.invoke<boolean>("node_install");
      setProgress(100); // 安装完成
      if (success) {
        setSuccess(true);
        checkNode();
        await cmd.message("Node installed successfully", "success");
      } else {
        await cmd.message("Node installation failed", "error");
      }
    } catch (error) {
      console.error("Install Node failed:", error);
      await cmd.message("Install Node failed", "error");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 bg-muted rounded-md p-2">
        <p className="text-sm font-medium">System Requirements:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
          <li>Windows 10 or higher</li>
          <li>A stable internet connection</li>
        </ul>
      </div>
      {isInstalling && (
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="max-h-40 overflow-y-auto bg-muted rounded-md p-2 space-y-1">
            {installLog.map((log, index) => (
              <p
                key={`install-${index}`}
                className="text-xs text-muted-foreground"
              >
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      <Button
        variant="primary"
        onClick={async () => {
          await installDeno();
        }}
        disabled={isInstalling || success}
        className="w-full h-10"
      >
        {isInstalling ? (
          <>
            <TbLoader2 className="w-4 h-4 animate-spin mr-2" />
            Installing...
          </>
        ) : (
          "Install"
        )}
      </Button>
    </div>
  );
};

export function DenoSettings() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    checkNode();
  }, []);

  const checkNode = async () => {
    try {
      setIsChecking(true);
      const result = await cmd.invoke<Record<string, string>>("node_check");
      setIsInstalled(result.installed === "true");
      if (result.installed === "true") {
        setVersion(result.version || "");
      } else {
        setVersion("");
      }
    } catch (error) {
      console.error("Check Node environment failed:", error);
      setIsInstalled(false);
      setVersion("");
    } finally {
      setIsChecking(false);
    }
  };

  const showInstallDialog = () => {
    dialog({
      title: "Install",
      description: `Installing Node will allow you to run and execute plugins. The
        installation process may take 1~2 minutes.
      `,
      content: <NodeInstallDialog checkNode={checkNode} />,
    });
  };

  const getDescription = () => {
    if (isChecking) {
      return "checking...";
    }
    if (!isInstalled) {
      return (
        <span className="text-yellow-600">
          ⚠️ Not installed - Cannot use plugin features
        </span>
      );
    }
    return `installed (${version})`;
  };

  return (
    <SettingItem
      icon={<TbFrustum className="w-[18px] h-[18px]" />}
      title="Plugins Execution Environment"
      description={getDescription()}
      action={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={checkNode}>
            <TbRotate
              className={`w-4 h-4 ${isChecking ? "animate-spin-reverse" : ""}`}
            />
            re-check
          </Button>
          {!isInstalled && (
            <Button size="sm" onClick={showInstallDialog}>
              install
            </Button>
          )}
        </div>
      }
    />
  );
}

export function UpdateSettings() {
  const [updateState, setUpdateState] = useState<
    "idle" | "checking" | "downloading" | "ready"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [newVersion, setNewVersion] = useState<string | null>(null);

  const checkForUpdates = async () => {
    try {
      const update = await check();
      console.log("update", update);
      if (update?.version) {
        const confirm = await cmd.confirm(`Ready to download the update?`);
        if (confirm) {
          setNewVersion(update.version);
          setUpdateState("downloading");
          let total = 100;
          let current = 0;
          await update.download((progress) => {
            if (progress.event === "Started") {
              total = progress.data.contentLength || 10000000;
            } else if (progress.event === "Progress") {
              current += progress.data.chunkLength;
            }
            setProgress(Math.round((current / total) * 100));
          });
          const confirmInstall = await cmd.confirm(
            `Ready to install the update?`,
          );
          if (confirmInstall) {
            await update.install();
            await relaunch();
          } else {
            setUpdateState("idle");
          }
        } else {
          setUpdateState("idle");
        }
      } else {
        toast.success(
          `Current version is the latest version ${PACKAGE_VERSION}`,
        );
        setUpdateState("idle");
      }
      return update;
    } catch (error) {
      console.error("Update check failed:", error);
      toast.error(`Update check failed, please try again later`);
      setUpdateState("idle");
      return false;
    }
  };

  const checkUpdate = async () => {
    setUpdateState("checking");
    setProgress(0);
    await checkForUpdates();
  };

  return (
    <SettingItem
      icon={
        <TbRotate
          className={`w-[18px] h-[18px] ${
            updateState === "checking" ? "animate-spin-reverse" : ""
          }`}
        />
      }
      title="Check for updates"
      description={
        updateState === "idle"
          ? `Current version: ${PACKAGE_VERSION}`
          : updateState === "checking"
            ? "Checking for updates..."
            : updateState === "downloading"
              ? `Downloading update v${newVersion} (${progress}%)`
              : `Update is ready v${newVersion}, click to restart`
      }
      action={
        <>
          {updateState === "idle" || updateState === "checking" ? (
            <Button
              onClick={checkUpdate}
              disabled={updateState !== "idle"}
              variant="primary"
              size="sm"
              className="flex items-center gap-1"
            >
              {updateState === "checking" && (
                <TbLoader2 className="w-4 h-4 animate-spin" />
              )}
              {updateState === "checking" ? "Checking..." : "Check for updates"}
            </Button>
          ) : updateState === "downloading" ? (
            <div className="w-32">
              <Progress value={progress} className="h-2" />
            </div>
          ) : (
            <Button
              onClick={async () => await relaunch()}
              variant="destructive"
              size="sm"
            >
              Restart
            </Button>
          )}
        </>
      }
    />
  );
}

export function ConfigDirSettings() {
  return (
    <SettingItem
      icon={<TbFolder className="w-[18px] h-[18px]" />}
      title="Local Configuration File Directory"
      action={
        <Button
          onClick={() => cmd.invoke("open_config_dir")}
          variant="ghost"
          size="sm"
        >
          Open Directory
        </Button>
      }
    />
  );
}

export function ProxySettings() {
  const settings = SettingsManager.use();
  const [host, setHost] = useState(settings.proxy.host);
  const [port, setPort] = useState(settings.proxy.port);

  useEffect(() => {
    setHost(settings.proxy.host);
    setPort(settings.proxy.port);
  }, [settings.proxy.host, settings.proxy.port]);

  const handleHostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setHost(e.target.value);
  };

  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPort(e.target.value);
  };

  const updateGlobalSettings = () => {
    SettingsManager.setProxy({ host, port });
  };

  const handleEnabledChange = (checked: boolean) => {
    SettingsManager.setProxy({ enabled: checked });
  };

  return (
    <SettingItem
      icon={<TbNetwork className="w-[18px] h-[18px]" />}
      title="SOCKS5 Proxy"
      description={
        settings.proxy.enabled
          ? `Enabled: ${settings.proxy.host}:${settings.proxy.port}`
          : "Disabled"
      }
      action={
        <div className="flex items-center gap-2">
          <Input
            type="text"
            placeholder="Host (e.g., 127.0.0.1)"
            value={host}
            onChange={handleHostChange}
            onBlur={updateGlobalSettings}
            className="w-32 h-8 text-xs"
            disabled={!settings.proxy.enabled}
          />
          <Input
            type="text"
            placeholder="Port (e.g., 1080)"
            value={port}
            onChange={handlePortChange}
            onBlur={updateGlobalSettings}
            className="w-20 h-8 text-xs"
            disabled={!settings.proxy.enabled}
          />
          <Switch
            checked={settings.proxy.enabled}
            disabled={true}
            title="Proxy is not supported in the current version"
            onCheckedChange={handleEnabledChange}
          />
        </div>
      }
    />
  );
}

export function AutoStartSettings() {
  const [autoStart, setAutoStart] = useState(false);

  useEffect(() => {
    isEnabled().then((enabled) => {
      setAutoStart(enabled);
    });
  }, []);

  useEffect(() => {
    if (autoStart) {
      enable();
    } else {
      disable();
    }
  }, [autoStart]);

  const handleEnabledChange = (checked: boolean) => {
    setAutoStart(checked);
  };

  return (
    <SettingItem
      icon={<TbAutomation className="w-[18px] h-[18px]" />}
      title="Auto Start"
      description={autoStart ? `Enabled: ${autoStart}` : "Disabled"}
      action={
        <div className="flex items-center gap-2">
          <Switch
            checked={autoStart}
            title="Auto Start is not supported in the current version"
            onCheckedChange={handleEnabledChange}
          />
        </div>
      }
    />
  );
}
