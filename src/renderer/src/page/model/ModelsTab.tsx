import { TabListItem } from "@/components/custom/TabListItem";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceSidebar } from "@/components/layout/PreferenceSidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { TbBox, TbPlus, TbSettings, TbEdit, TbTrash } from "react-icons/tb";
import { ProviderItem } from "./ProviderItem";
import { ProviderConfigDialog } from "./ProviderConfigDialog";
import { useProviders, ProviderConfigItem } from "@/hooks/useProviders";

export function ModelsTab() {
  const [selectedProvider, setSelectedProvider] =
    useState<ProviderConfigItem | null>(null);
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [configDialogMode, setConfigDialogMode] = useState<"add" | "edit">(
    "add",
  );
  const [editingProvider, setEditingProvider] = useState<
    ProviderConfigItem | undefined
  >();

  const {
    providers,
    loading,
    error,
    fetchProviders,
    addCustomProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    getSupportedFormats,
  } = useProviders();

  // 初始化时获取providers
  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleAddProvider = () => {
    setConfigDialogMode("add");
    setEditingProvider(undefined);
    setIsConfigDialogOpen(true);
  };

  const handleEditProvider = (provider: ProviderConfigItem) => {
    setConfigDialogMode("edit");
    setEditingProvider(provider);
    setIsConfigDialogOpen(true);
  };

  const handleDeleteProvider = async (providerName: string) => {
    if (confirm(`确定要删除Provider "${providerName}" 吗？`)) {
      try {
        await deleteProvider(providerName);
      } catch (error) {
        console.error("删除Provider失败:", error);
      }
    }
  };

  return (
    <>
      <PreferenceLayout>
        {/* 左侧列表 */}
        <PreferenceSidebar
          left={
            <div className="flex items-center gap-2">
              <TbSettings className="w-4 h-4" />
              <span className="text-sm font-medium">Provider 配置</span>
            </div>
          }
          right={
            <div className="flex items-center gap-2">
              <div className="text-xs text-muted-foreground">
                {loading ? "加载中..." : `${providers.length} providers`}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={handleAddProvider}
              >
                <TbPlus className="w-4 h-4" />
              </Button>
            </div>
          }
          items={providers.map((provider) => ({
            id: provider.name,
            content: (
              <div className="group">
                <TabListItem
                  title={provider.displayName}
                  description={
                    provider.description ||
                    `${provider.format.toUpperCase()} 格式的 Provider`
                  }
                  icon={
                    <div className="w-7 h-7 p-1 rounded-lg bg-muted flex items-center justify-center text-xs font-bold relative">
                      {provider.displayName.charAt(0).toUpperCase()}
                      <Badge
                        variant="secondary"
                        className="absolute -top-1 -right-1 h-4 px-1 text-xs"
                      >
                        {provider.format.toUpperCase()}
                      </Badge>
                    </div>
                  }
                  actions={
                    <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditProvider(provider);
                        }}
                      >
                        <TbEdit className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProvider(provider.name);
                        }}
                      >
                        <TbTrash className="h-3 w-3" />
                      </Button>
                    </div>
                  }
                />
              </div>
            ),
            onClick: () => setSelectedProvider(provider),
            actived: selectedProvider?.name === provider.name,
            onRemove: () => {},
            noRemove: true,
          }))}
          emptyText={
            loading
              ? "正在加载 Provider 配置..."
              : error
                ? `加载失败: ${error}`
                : "没有找到 Provider 配置"
          }
          EmptyIcon={TbPlus}
        />

        {/* 右侧编辑区域 */}
        <PreferenceBody
          emptyText={loading ? "正在加载..." : "请选择一个 Provider 进行配置"}
          isEmpty={!selectedProvider}
          EmptyIcon={TbBox}
        >
          {selectedProvider && <ProviderItem provider={selectedProvider} />}
        </PreferenceBody>
      </PreferenceLayout>

      <ProviderConfigDialog
        open={isConfigDialogOpen}
        onOpenChange={setIsConfigDialogOpen}
        provider={editingProvider}
        mode={configDialogMode}
      />
    </>
  );
}
