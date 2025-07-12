import { TabListItem } from "@/components/custom/TabListItem";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { DropdownMenuRadioGroup } from "@radix-ui/react-dropdown-menu";
import { Echo } from "echo-state";
import { useEffect, useMemo, useState } from "react";
import { TbBox, TbPlus } from "react-icons/tb";
import { ModelItem } from "./ModelItem";

export enum ModelTab {
  TEXT = "text",
  EMBEDDING = "embedding",
  VISION = "vision",
  IMAGE = "image",
}

const selectedTab = new Echo<ModelTab>(ModelTab.TEXT).localStorage({
  name: "selectedTab",
});

export function ModelsTab() {
  const [selectedModel, setSelectedModel] = useState<any>();
  const tab = selectedTab.use();
  const [providers, setProviders] = useState<any>({});

  const items = useMemo(() => {
    return Object.values(providers);
  }, [providers]);

  useEffect(() => {
    if (tab === ModelTab.TEXT) {
      setSelectedModel(null);
      setProviders({});
    } else if (tab === ModelTab.EMBEDDING) {
      setSelectedModel(null);
      setProviders({});
    } else if (tab === ModelTab.VISION) {
      setSelectedModel(null);
      setProviders({});
    } else if (tab === ModelTab.IMAGE) {
      setSelectedModel(null);
      setProviders({});
    } else {
      setSelectedModel(null);
      setProviders({});
    }
  }, [tab]);

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceSidebar
        left={
          <div className="flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="gap-1 bg-muted-foreground/10 hover:bg-muted-foreground/20"
                >
                  <TbBox className="w-4 h-4" /> {tab}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuRadioGroup
                  value={tab}
                  onValueChange={(value) => selectedTab.set(value as ModelTab)}
                >
                  {Object.values(ModelTab).map((modelTab) => (
                    <DropdownMenuRadioItem key={modelTab} value={modelTab}>
                      {modelTab}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
        right={
          <div className="text-xs text-muted-foreground pr-2">
            {items.length} providers
          </div>
        }
        items={items.map((provider: any) => ({
          id: provider.name,
          content: (
            <TabListItem
              title={provider.name}
              description={`${Object.keys(provider.models).length} models`}
              icon={
                <img
                  src={`/${provider.icon}`}
                  className={cn(
                    "w-7 h-7 p-1 rounded-lg",
                      false ? "bg-white" : "",
                  )}
                  alt={provider.name}
                />
              }
            />
          ),
          onClick: () => setSelectedModel(provider),
          actived: selectedModel?.name === provider.name,
          onRemove: () => {},
          noRemove: true,
        }))}
        emptyText="no model, click the button above to add a new model"
        EmptyIcon={TbPlus}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="please choose a model or click the button above to add a new model"
        isEmpty={!selectedModel}
        EmptyIcon={TbBox}
      >
        {selectedModel && (
          <ModelItem model={selectedModel} providers={providers} />
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
