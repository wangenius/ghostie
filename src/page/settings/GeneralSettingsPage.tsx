import { TabListItem } from "@/components/custom/TabListItem";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { Echoi } from "@/lib/echo/Echo";
import { cn } from "@/lib/utils";
import {
  TbBook,
  TbGhost3,
  TbPalette,
  TbTableShortcut,
  TbUser,
  TbVariable,
} from "react-icons/tb";
import { AuthSettings } from "./components/AuthSettings";
import {
  MaxHistorySettings,
  ReactMaxIterationsSettings,
} from "./components/ChatAgentSettings";
import EnvironmentVariablesTab from "./components/EnvironmentVariablesTab";
import {
  KnowledgeModelSettings,
  KnowledgeThresholdSettings,
} from "./components/KnowledgeSettings";
import {
  AutoStartSettings,
  ConfigDirSettings,
  DenoSettings,
  FontSettings,
  ProxySettings,
  ThemeSettings,
  UpdateSettings,
} from "./components/SystemSettings";
import ShortcutsTab from "./ShortcutsTab";

const items = [
  {
    name: "account",
    icon: TbUser,
    component: [AuthSettings],
  },
  {
    name: "preferences",
    icon: TbPalette,
    component: [
      ThemeSettings,
      FontSettings,
      AutoStartSettings,
      DenoSettings,
      UpdateSettings,
      ProxySettings,
      ConfigDirSettings,
    ],
  },
  {
    name: "agent",
    icon: TbGhost3,
    component: [MaxHistorySettings, ReactMaxIterationsSettings],
  },
  {
    name: "knowledge",
    icon: TbBook,
    component: [KnowledgeModelSettings, KnowledgeThresholdSettings],
  },
  {
    name: "shortcuts",
    icon: TbTableShortcut,
    component: [ShortcutsTab],
  },
  {
    name: "environment variables",
    icon: TbVariable,
    component: [EnvironmentVariablesTab],
  },
];

const CurrentItem = new Echoi<string>("account");

export function GeneralSettingsPage() {
  const currentItem = CurrentItem.use();
  return (
    <PreferenceLayout>
      <PreferenceList
        left={<Button>Settings</Button>}
        items={items.map((item) => ({
          id: item.name,
          content: (
            <TabListItem
              icon={<item.icon className="size-5 text-muted-foreground" />}
              title={item.name || "未命名"}
              description={""}
            />
          ),
          onClick: async () => {
            CurrentItem.set(item.name);
          },
          actived: item.name === currentItem,
          noRemove: true,
        }))}
      />

      <PreferenceBody
        className={cn("rounded-xl flex-1 px-6")}
        header={
          <div className="flex items-center justify-between w-full px-6 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold">{currentItem}</h3>
            </div>
          </div>
        }
      >
        {items
          .find((item) => item.name === currentItem)
          ?.component.map((Component) => <Component />)}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
