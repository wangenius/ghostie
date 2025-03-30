import { ModelType } from "@/model/types/model";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { ModelManager } from "@/model/ModelManager";
import { SettingsManager } from "@/settings/SettingsManager";
import { cmd } from "@/utils/shell";
import { ReactNode, useState } from "react";
import {
  TbArrowIteration,
  TbDatabase,
  TbFolder,
  TbHistory,
  TbPalette,
  TbRotate,
  TbTypography,
} from "react-icons/tb";

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
    { name: "siyuan", label: "siyuan" },
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
  const models = ModelManager.use();

  return (
    <>
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Knowledge Content Model"
        description="Model used to parse text, recommended for asynchronous batch processing model"
        action={
          <Select
            value={knowledge.contentModel}
            onValueChange={(value) => {
              const model = models[value];
              if (model) {
                SettingsManager.setKnowledge({ contentModel: model.id });
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(models)
                .filter((model) => model.type === ModelType.EMBEDDING)
                .map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
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
              const model = models[value];
              if (model) {
                SettingsManager.setKnowledge({ searchModel: model.id });
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select Model" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(models)
                .filter((model) => model.type === ModelType.EMBEDDING)
                .map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
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
      <h3 className="text-lg font-bold">System</h3>
      <ThemeSettings />
      <FontSettings />
      <UpdateSettings />
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
