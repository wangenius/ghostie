import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { AuthSettings } from "./components/AuthSettings";
import {
  MaxHistorySettings,
  ReactMaxIterationsSettings,
} from "./components/ChatAgentSettings";
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
    component: [AuthSettings],
  },
  {
    name: "system",
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
    name: "chatagent",
    component: [MaxHistorySettings, ReactMaxIterationsSettings],
  },
  {
    name: "knowledge",
    component: [KnowledgeModelSettings, KnowledgeThresholdSettings],
  },
  {
    name: "shortcuts",
    component: [ShortcutsTab],
  },
];

export function GeneralSettingsPage() {
  const [currentItem, setCurrentItem] = useState<string>("");
  return (
    <PreferenceLayout>
      <PreferenceList
        left={<div className="flex items-center gap-2">Settings</div>}
        items={items.map((item) => ({
          id: item.name,
          title: (
            <div className="flex items-center gap-2">
              {item.name || "未命名"}
            </div>
          ),
          onClick: async () => {
            setCurrentItem(item.name);
          },
          actived: item.name === currentItem,
          noRemove: true,
        }))}
      />

      <PreferenceBody
        className={cn("rounded-xl flex-1")}
        header={
          <div className="flex items-center justify-between w-full">
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
    // <div className="space-y-2 max-w-screen-lg mx-auto px-4 h-full overflow-y-auto">
    //   <h3 className="text-lg font-bold">Account</h3>
    //   < />
    //   <h3 className="text-lg font-bold pt-6">System</h3>
    //   <ThemeSettings />
    //   <FontSettings />
    //   <AutoStartSettings />
    //   <DenoSettings />
    //   <UpdateSettings />
    //   <ProxySettings />
    //   <ConfigDirSettings />
    //   <h3 className="text-lg font-bold pt-6">ChatAgent</h3>
    //   <MaxHistorySettings />
    //   <ReactMaxIterationsSettings />
    //   <h3 className="text-lg font-bold pt-6">Knowledge</h3>
    //   <KnowledgeModelSettings />
    //   <KnowledgeThresholdSettings />
    //   <h3 className="text-lg font-bold pt-6">Shortcuts</h3>
    //   <ShortcutsTab />
    // </div>
  );
}
