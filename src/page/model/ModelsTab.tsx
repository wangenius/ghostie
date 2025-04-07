import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChatModelManager } from "@/model/chat/ChatModelManager";
import { SettingsManager } from "@/settings/SettingsManager";
import { getColor } from "@/utils/color";
import { DropdownMenuRadioGroup } from "@radix-ui/react-dropdown-menu";
import { useEffect, useMemo, useState } from "react";
import { TbBox, TbPlus } from "react-icons/tb";
import { EmbeddingModelManager } from "../../model/embedding/EmbeddingModelManger";
import { ModelProvider } from "../../model/types/model";
import { ModelItem } from "./ModelItem";

export enum ModelTab {
  TEXT = "text",
  EMBEDDING = "embedding",
  IMAGE = "image",
  AUDIO = "audio",
  VIDEO = "video",
  MULTIMODAL = "multimodal",
}

export function ModelsTab() {
  const [selectedModel, setSelectedModel] = useState<any>();
  const [isAddModelDrawerOpen, setIsAddModelDrawerOpen] = useState(false);
  const [tab, setTab] = useState<ModelTab>(ModelTab.TEXT);
  // 获取所有已注册的模型提供商

  const { theme } = SettingsManager.use();

  const [providers, setProviders] = useState<Record<string, ModelProvider>>(
    ChatModelManager.getProviders(),
  );

  const items = useMemo(() => {
    return Object.values(providers);
  }, [providers]);

  useEffect(() => {
    if (tab === ModelTab.TEXT) {
      setSelectedModel(null);
      setProviders(ChatModelManager.getProviders());
    } else if (tab === ModelTab.EMBEDDING) {
      setSelectedModel(null);
      setProviders(EmbeddingModelManager.getProviders());
    } else {
      setSelectedModel(null);
      setProviders({});
    }
  }, [tab]);

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
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
                  onValueChange={(value) => setTab(value as ModelTab)}
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
        items={items.map((provider) => ({
          id: provider.name,
          title: (
            <div className="flex items-center justify-between gap-2">
              {provider.icon && (
                <img
                  src={`/${provider.icon}`}
                  className={cn(
                    "w-7 h-7 p-1 rounded-lg",
                    theme.name === "dark" ? "bg-white" : "",
                  )}
                  alt={provider.name}
                />
              )}
              <div className="flex justify-between flex-1 gap-1">
                <span className="font-bold text-sm truncate">
                  {provider.name}
                </span>
              </div>
            </div>
          ),
          description: (
            <div className="text-xs text-muted-foreground">
              <span className="text-xs text-muted-foreground">
                {Object.keys(provider.models).length} models
              </span>
            </div>
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

      {/* 添加模型抽屉 */}
      <Drawer
        open={isAddModelDrawerOpen}
        onOpenChange={setIsAddModelDrawerOpen}
        title="choose model provider"
      >
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground mb-4">
            please choose a model provider, or choose "base model" to create a
            general model configuration.
          </div>

          {/* 基础模型选项 */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent cursor-pointer">
            <div>
              <div className="text-sm font-medium">base model</div>
              <div className="text-xs text-muted-foreground">
                use any model in the standard OpenAI API format
              </div>
            </div>
          </div>

          {/* 提供商列表 */}
          {Object.entries(providers).map(([key, provider]) => (
            <div
              key={key}
              className="flex items-center justify-between p-3 rounded-lg bg-card hover:bg-accent cursor-pointer"
              onClick={() => {}}
            >
              <div>
                <div className="text-sm font-medium">{provider.name}</div>
                <div className="text-xs text-muted-foreground">
                  {provider.description}
                </div>
              </div>
              <div
                className="px-2 py-0.5 text-xs rounded-full text-white"
                style={{ backgroundColor: getColor(key) }}
              >
                {key}
              </div>
            </div>
          ))}
        </div>
      </Drawer>
    </PreferenceLayout>
  );
}
