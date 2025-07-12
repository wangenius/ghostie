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
import { useModels, ModelType } from "@/hooks/useModels";

export enum ModelTab {
  TEXT = "text",
  EMBEDDING = "embedding",
  VISION = "vision",
  IMAGE = "image",
  AUDIO = "audio",
}

const selectedTab = new Echo<ModelTab>(ModelTab.TEXT).localStorage({
  name: "selectedTab",
});

export function ModelsTab() {
  const [selectedModel, setSelectedModel] = useState<any>();
  const tab = selectedTab.use();
  const { providers, loading, error, fetchProviders, getApiKey, setApiKey } = useModels();

  const items = useMemo(() => {
    return Object.values(providers);
  }, [providers]);

  // 当标签页切换时，获取对应类型的模型提供商
  useEffect(() => {
    let modelType: ModelType;
    switch (tab) {
      case ModelTab.TEXT:
        modelType = ModelType.TEXT;
        break;
      case ModelTab.EMBEDDING:
        modelType = ModelType.EMBEDDING;
        break;
      case ModelTab.VISION:
        modelType = ModelType.VISION;
        break;
      case ModelTab.IMAGE:
        modelType = ModelType.IMAGE;
        break;
      case ModelTab.AUDIO:
        modelType = ModelType.AUDIO;
        break;
      default:
        modelType = ModelType.TEXT;
    }
    
    fetchProviders(modelType);
    setSelectedModel(null);
  }, [tab, fetchProviders]);

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
            {loading ? "加载中..." : `${items.length} providers`}
          </div>
        }
        items={items.map((provider: any) => ({
          id: provider.name,
          content: (
            <TabListItem
              title={provider.name}
              description={`${Object.keys(provider.models || {}).length} models`}
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
        emptyText={
          loading 
            ? "正在加载模型提供商..." 
            : error 
            ? `加载失败: ${error}` 
            : "没有找到模型提供商"
        }
        EmptyIcon={TbPlus}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText={
          loading 
            ? "正在加载..." 
            : "请选择一个模型提供商查看详情"
        }
        isEmpty={!selectedModel}
        EmptyIcon={TbBox}
      >
        {selectedModel && (
          <ModelItem 
            model={selectedModel} 
            providers={providers}
            getApiKey={getApiKey}
            setApiKey={setApiKey}
          />
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
