import { dialog } from "@/components/custom/DialogModal";
import { FormContainer, FormInput } from "@/components/custom/FormWrapper";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { EmbeddingModelManager } from "@/model/embedding/EmbeddingModelManger";
import { SettingsManager } from "@/settings/SettingsManager";
import { cmd } from "@/utils/shell";
import { ReactNode, useEffect, useState } from "react";
import {
  TbArrowIteration,
  TbDatabase,
  TbFolder,
  TbHistory,
  TbLoader2,
  TbNetwork,
  TbPalette,
  TbRotate,
  TbTypography,
  TbUser,
} from "react-icons/tb";
import { UserMananger } from "./User";

interface SettingItemProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action: ReactNode;
  titleClassName?: string;
}

function SettingItem({
  icon,
  title,
  description,
  action,
  titleClassName,
}: SettingItemProps) {
  return (
    <div className="flex items-center justify-between h-12 px-3 -mx-3 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-muted-foreground">{icon}</div>
        <div>
          <div className={cn("text-sm text-foreground", titleClassName)}>
            {title}
          </div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      {action}
    </div>
  );
}

function AuthSettings() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const user = UserMananger.use();

  // 登出处理
  const handleLogout = async () => {
    await UserMananger.logout();
  };

  const showLoginDialog = () => {
    dialog({
      title: "Login",
      className: "w-96",
      content: (close) => (
        <FormContainer
          className="w-full"
          onSubmit={async (data) => {
            try {
              setIsLoggingIn(true);
              await UserMananger.login(data.email, data.password);
              close();
            } finally {
              setIsLoggingIn(false);
            }
          }}
        >
          <div className="space-y-4">
            <FormInput
              name="email"
              type="email"
              placeholder="please enter email"
              required
              autoComplete="false"
            />

            <FormInput
              name="password"
              type="password"
              placeholder="please enter password"
              required
              autoComplete="false"
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="submit" disabled={isLoggingIn}>
                {isLoggingIn ? (
                  <>
                    <TbLoader2 className="w-4 h-4 animate-spin" />
                    logging in...
                  </>
                ) : (
                  "login"
                )}
              </Button>
            </div>
          </div>
        </FormContainer>
      ),
    });
  };

  const showRegisterDialog = () => {
    dialog({
      title: "Register",
      className: "w-96",
      content: (close) => (
        <FormContainer
          className="w-full"
          onSubmit={async (data) => {
            if (data.password !== data.confirmPassword) {
              cmd.message(
                "The passwords you entered are inconsistent",
                "error",
              );
              return;
            }
            try {
              setIsRegistering(true);
              await UserMananger.register(data.email, data.password);
              close();
            } finally {
              setIsRegistering(false);
            }
          }}
        >
          <div className="space-y-4">
            <FormInput
              name="email"
              type="email"
              placeholder="please enter email"
              required
            />
            <FormInput
              name="password"
              type="password"
              placeholder="please enter password"
              required
            />
            <FormInput
              name="confirmPassword"
              type="password"
              placeholder="please enter password again"
              required
            />
            <div className="flex justify-end gap-2 mt-4">
              <Button type="submit" disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <TbLoader2 className="w-4 h-4 animate-spin" />
                    registering...
                  </>
                ) : (
                  "register"
                )}
              </Button>
            </div>
          </div>
        </FormContainer>
      ),
    });
  };

  return (
    <SettingItem
      icon={<TbUser className="w-[18px] h-[18px]" />}
      title={user ? "Account" : "Not logged in"}
      description={
        user
          ? `Current login: ${user.user_metadata.name || user.email}`
          : "Not logged in"
      }
      action={
        user ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            disabled={isLoggingIn}
          >
            logout
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button size="sm" onClick={showLoginDialog}>
              login
            </Button>
            <Button size="sm" onClick={showRegisterDialog}>
              register
            </Button>
          </div>
        )
      }
    />
  );
}

function ThemeSettings() {
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

function FontSettings() {
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
          className={`w-[18px] h-[18px] ${checking ? "animate-spin" : ""}`}
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

function ConfigDirSettings() {
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

function ProxySettings() {
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

function ReactMaxIterationsSettings() {
  const settings = SettingsManager.use();

  return (
    <SettingItem
      icon={<TbArrowIteration className="w-[18px] h-[18px]" />}
      title="ReActMaxIterations"
      titleClassName="font-bold"
      description={`Agent task maximum iterations, current: ${settings.reActMaxIterations}`}
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
      description={`Maximum number of context messages in the conversation, current: ${settings.maxHistory}`}
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

function KnowledgeModelSettings() {
  const { knowledge } = SettingsManager.use();

  return (
    <>
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Knowledge Content Model"
        description="Model used to parse text, recommended for asynchronous batch processing model"
        action={
          <Select
            value={knowledge.baseModel}
            onValueChange={(value) => {
              SettingsManager.setKnowledge({ baseModel: value });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(EmbeddingModelManager.getProviders()).map(
                (provider) => {
                  const models = provider.models;
                  return Object.values(models).map((model) => (
                    <SelectItem
                      key={model.name}
                      value={`${provider.name}:${model.name}`}
                    >
                      {model.name}
                    </SelectItem>
                  ));
                },
              )}
            </SelectContent>
          </Select>
        }
      />
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Knowledge Search Model"
        description="Model used to vectorize search terms, recommended for synchronous model"
        action={
          <Select
            value={knowledge.searchModel}
            onValueChange={(value) => {
              SettingsManager.setKnowledge({ searchModel: value });
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(EmbeddingModelManager.getProviders()).map(
                (provider) => {
                  const models = provider.models;
                  return Object.values(models).map((model) => (
                    <SelectItem
                      key={model.name}
                      value={`${provider.name}:${model.name}`}
                    >
                      {model.name}
                    </SelectItem>
                  ));
                },
              )}
            </SelectContent>
          </Select>
        }
      />
    </>
  );
}

function KnowledgeThresholdSettings() {
  const { knowledge } = SettingsManager.use();

  return (
    <>
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Similarity Threshold"
        description={`Current: ${(knowledge.threshold * 100).toFixed(0)}%`}
        action={
          <Slider
            value={[knowledge.threshold]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={([value]) =>
              SettingsManager.setKnowledge({ threshold: value })
            }
            className="w-32"
          />
        }
      />
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Result Number"
        description={`Current: ${knowledge.limit}`}
        action={
          <Slider
            value={[knowledge.limit]}
            min={1}
            max={50}
            step={1}
            onValueChange={([value]) =>
              SettingsManager.setKnowledge({ limit: value })
            }
            className="w-32"
          />
        }
      />
    </>
  );
}

export function GeneralSettingsPage() {
  return (
    <div className="space-y-2 max-w-screen-lg mx-auto px-4 h-full overflow-y-auto">
      <h3 className="text-lg font-bold">账户</h3>
      <AuthSettings />
      <h3 className="text-lg font-bold pt-6">系统</h3>
      <ThemeSettings />
      <FontSettings />
      <UpdateSettings />
      <ProxySettings />
      <h3 className="text-lg font-bold pt-6">ChatAgent</h3>
      <ConfigDirSettings />
      <MaxHistorySettings />
      <ReactMaxIterationsSettings />
      <h3 className="text-lg font-bold pt-6">Knowledge</h3>
      <KnowledgeModelSettings />
      <KnowledgeThresholdSettings />
    </div>
  );
}
