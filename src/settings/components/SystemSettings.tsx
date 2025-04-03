import { dialog } from "@/components/custom/DialogModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cmd } from "@/utils/shell";
import { useEffect, useState } from "react";
import {
  TbFolder,
  TbFrustum,
  TbLoader2,
  TbNetwork,
  TbPalette,
  TbRotate,
  TbTypography,
} from "react-icons/tb";
import { SettingsManager } from "../SettingsManager";
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
      title="Theme Settings"
      description={`Current theme: ${settings.theme.label}`}
      action={
        <div className="flex gap-1">
          {themes.map((theme) => (
            <Button
              key={theme.name}
              size="sm"
              variant={
                settings.theme.name === theme.name ? "secondary" : "ghost"
              }
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

export function FontSettings() {
  const settings = SettingsManager.use();
  const fonts = [
    { name: "maple", label: "maple" },
    { name: "mono", label: "jetbrains" },
    { name: "harmony", label: "harmony" },
    { name: "default", label: "default" },
  ];

  return (
    <SettingItem
      icon={<TbTypography className="w-[18px] h-[18px]" />}
      title="Font Settings"
      description={`Current font: ${settings.font.label}`}
      action={
        <div className="flex gap-1">
          {fonts.map((font) => (
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

const DenoInstallDialog = ({ checkDeno }: { checkDeno: () => void }) => {
  const [isInstalling, setIsInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState("");
  const [dialogInstance, setDialogInstance] = useState<(() => void) | null>(
    null,
  );

  const installDeno = async () => {
    let unlistenProgress: (() => void) | null = null;
    let unlistenError: (() => void) | null = null;

    try {
      setIsInstalling(true);
      setInstallProgress("Installing...");

      // 监听安装进度
      unlistenProgress = await cmd.listen("deno_install_progress", (event) => {
        setInstallProgress(event.payload);
      });

      // 监听安装错误
      unlistenError = await cmd.listen("deno_install_error", (event) => {
        console.error("Install error:", event.payload);
        setInstallProgress(`Error: ${event.payload}`);
      });

      const success = await cmd.invoke<boolean>("deno_install");

      if (success) {
        checkDeno();
        await cmd.message("Deno installed successfully", "success");
        if (dialogInstance) {
          dialogInstance();
          setDialogInstance(null);
        }
      } else {
        await cmd.message("Deno installation failed", "error");
      }
    } catch (error) {
      console.error("Install Deno failed:", error);
      await cmd.message("Install Deno failed", "error");
    } finally {
      // 确保清理监听器
      if (unlistenProgress) unlistenProgress();
      if (unlistenError) unlistenError();
      setIsInstalling(false);
      setInstallProgress("");
    }
  };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Installing Deno will allow you to run and execute plugins. The
        installation process may take several minutes.
      </p>
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">System Requirements:</p>
        <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
          <li>Windows 10 or higher</li>
          <li>At least 100MB of available disk space</li>
          <li>A stable internet connection</li>
        </ul>
      </div>
      {installProgress && (
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <TbLoader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">{installProgress}</span>
          </div>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => {
            close();
            setDialogInstance(null);
          }}
          disabled={isInstalling}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={async () => {
            setDialogInstance(close);
            await installDeno();
          }}
          disabled={isInstalling}
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
    </div>
  );
};

export function DenoSettings() {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [version, setVersion] = useState<string>("");

  useEffect(() => {
    checkDeno();
  }, []);

  const checkDeno = async () => {
    try {
      setIsChecking(true);
      const result = await cmd.invoke<Record<string, string>>("deno_check");
      setIsInstalled(result.installed === "true");
      if (result.installed === "true") {
        setVersion(result.version || "");
      } else {
        setVersion("");
      }
    } catch (error) {
      console.error("Check Deno environment failed:", error);
      setIsInstalled(false);
      setVersion("");
    } finally {
      setTimeout(() => {
        setIsChecking(false);
      }, 300);
    }
  };

  const showInstallDialog = () => {
    dialog({
      title: "Install",
      description:
        "Deno is a secure JavaScript and TypeScript runtime environment for executing plugins.",
      content: <DenoInstallDialog checkDeno={checkDeno} />,
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
        isInstalled ? (
          <Button variant="ghost" size="sm" onClick={checkDeno}>
            <TbRotate
              className={`w-4 h-4 ${isChecking ? "animate-spin-reverse" : ""}`}
            />
            re-check
          </Button>
        ) : (
          <Button size="sm" onClick={showInstallDialog}>
            install
          </Button>
        )
      }
    />
  );
}

export function UpdateSettings() {
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
      console.error("Update check failed:", error);
      return false;
    }
  };

  const checkUpdate = async () => {
    setChecking(true);
    try {
      const hasUpdate = await checkForUpdates();
      if (!hasUpdate) {
        await cmd.message(
          `Already the latest version ${PACKAGE_VERSION}`,
          "Confirm",
        );
      }
    } finally {
      setChecking(false);
    }
  };

  return (
    <SettingItem
      icon={
        <TbRotate
          className={`w-[18px] h-[18px] ${
            checking ? "animate-spin-reverse" : ""
          }`}
        />
      }
      title="Check Updates"
      description={`Current version: ${PACKAGE_VERSION}`}
      action={
        <Button
          onClick={checkUpdate}
          disabled={checking}
          variant="primary"
          size="sm"
        >
          {checking ? "Checking..." : "Check Updates"}
        </Button>
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
