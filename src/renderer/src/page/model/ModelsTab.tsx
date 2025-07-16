import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { ProviderConfigEditor } from "@/page/model/ProviderConfigEditor";
import { Button } from "@/components/ui/button";
import { useProviders } from "@/hooks/useProviders";
import { cn } from "@/lib/utils";
import { ProviderConfigItem } from "@common/types/ProviderTypes";
import { useState } from "react";
import { TbLoader2, TbPlus, TbServer } from "react-icons/tb";

export function ModelsTab() {
  const { providers, loading, deleteProvider } = useProviders();
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderConfigItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const handleSelectProvider = (provider: ProviderConfigItem) => {
    setSelectedProvider(provider);
    setIsCreating(false);
  };

  const handleCreateProvider = () => {
    setSelectedProvider(null);
    setIsCreating(true);
  };

  const handleSaveProvider = (savedProvider?: ProviderConfigItem) => {
    setIsCreating(false);
    // 如果是创建新provider，设置为当前选中的provider
    if (savedProvider && isCreating) {
      setSelectedProvider(savedProvider);
    }
    // 如果是编辑现有provider，保持当前选中状态不变
  };

  const handleCancelEdit = () => {
    setIsCreating(false);
    setSelectedProvider(null);
  };

  const handleDeleteProvider = async (provider: ProviderConfigItem) => {
    await deleteProvider(provider.id);
    if (selectedProvider?.id === provider.id) {
      setSelectedProvider(null);
    }
  };

  // 过滤已配置的Provider（有API Key的）
  const configuredProviders = providers.filter(
    (provider) => provider.apiKey && provider.apiKey.trim() !== "",
  );

  // 将providers数组转换为sidebar items
  const sidebarItems = configuredProviders.map((provider) => ({
    id: provider.id,
    content: <ProviderListItem provider={provider} isTesting={false} />,
    onClick: () => handleSelectProvider(provider),
    actived: selectedProvider?.id === provider.id,
    onRemove: () => handleDeleteProvider(provider),
  }));

  return (
    <PreferenceLayout>
      {/* 左侧Provider列表 */}
      <PreferenceSidebar
        right={
          <Button
            className="flex-1"
            onClick={handleCreateProvider}
            disabled={loading}
          >
            <TbPlus className="w-4 h-4" />
            New Provider
          </Button>
        }
        items={sidebarItems}
        emptyText="No configured providers found. Create a new provider and add an API key to get started."
        EmptyIcon={TbServer}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select a provider or click the add button to create a new provider"
        EmptyIcon={TbServer}
        isEmpty={!selectedProvider && !isCreating}
        className="rounded-xl flex-1"
      >
        {(selectedProvider || isCreating) && (
          <ProviderConfigEditor
            provider={selectedProvider}
            isCreating={isCreating}
            onSave={handleSaveProvider}
            onCancel={handleCancelEdit}
          />
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}

// Provider列表项组件
const ProviderListItem = ({
  provider,
  isTesting,
}: {
  provider: ProviderConfigItem;
  isTesting: boolean;
}) => {
  const hasApiKey = provider.apiKey && provider.apiKey.trim() !== "";

  return (
    <div className="flex items-center justify-between gap-2 min-h-8">
      <div className="flex flex-col items-start justify-start flex-1 gap-1">
        <div className="flex items-center gap-2 w-full">
          <span className="font-bold text-sm truncate flex-1">
            {provider.name || provider.id}
          </span>
        </div>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                hasApiKey ? "bg-green-500" : "bg-yellow-500",
              )}
            />
            {isTesting && (
              <TbLoader2 className="w-3 h-3 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
