import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProviders } from "@/hooks/useProviders";
import { gen } from "@common/generator";
import { ProviderConfigItem } from "@common/types/ProviderTypes";
import React, { useEffect, useState } from "react";
import { TbCheck, TbLoader2, TbPlus, TbTrash, TbX } from "react-icons/tb";
import { dialog } from "@/components/custom/DialogModal";

interface ProviderConfigEditorProps {
  provider: ProviderConfigItem | null;
  onSave?: (savedProvider?: ProviderConfigItem) => void;
  onCancel?: () => void;
  onDelete?: () => void;
  isCreating?: boolean;
}

export const ProviderConfigEditor: React.FC<ProviderConfigEditorProps> = ({
  provider,
  onSave,
  onCancel,
  onDelete,
  isCreating = false,
}) => {
  const {
    addProvider,
    updateProvider,
    deleteProvider,
    testProvider,
    getSupportedFormats,
    getCommonModels,
  } = useProviders();

  const [formData, setFormData] = useState<ProviderConfigItem>(() => {
    if (provider) {
      return { ...provider };
    }
    return {
      id: gen.id(),
      name: "",
      format: "openai",
      baseUrl: "",
      apiKey: "",
      builtin: false,
      models: [],
    };
  });
  const [loading, setLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [showModelsManager, setShowModelsManager] = useState(false);
  const [newModelName, setNewModelName] = useState("");
  const [supportedFormats, setSupportedFormats] = useState<string[]>([
    "openai",
    "qwen",
    "anthropic",
  ]);

  // 获取支持的格式和常用模型
  useEffect(() => {
    const loadData = async () => {
      try {
        const formats = await getSupportedFormats();
        setSupportedFormats(formats);
      } catch (error) {
        console.error("Failed to load provider data:", error);
      }
    };
    loadData();
  }, [getSupportedFormats, getCommonModels]);

  // 当provider变化时更新表单数据
  useEffect(() => {
    if (provider) {
      setFormData({ ...provider });
    } else if (isCreating) {
      setFormData({
        id: gen.id(),
        name: "",
        format: "openai",
        baseUrl: "",
        apiKey: "",
        models: [],
      });
    }
    setTestResult(null);
  }, [provider, isCreating]);

  const handleInputChange = (field: keyof ProviderConfigItem, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      // 当name变化时，同时更新id（仅在创建时）
      if (field === "name" && value && isCreating) {
        updated.id = value;
        updated.name = value.charAt(0).toUpperCase() + value.slice(1);
      }
      return updated;
    });
    // 清除测试结果
    setTestResult(null);
  };

  const handleTest = async () => {
    if (!formData.id || !formData.apiKey) {
      setTestResult("请填写Provider名称和API Key");
      return;
    }

    try {
      setIsTesting(true);
      const result = await testProvider(formData);
      setTestResult(
        result.success
          ? "连接测试成功！"
          : `连接测试失败: ${result.error || "未知错误"}`,
      );
    } catch (error) {
      console.error("Test failed:", error);
      setTestResult(`测试失败: ${error}`);
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.baseUrl) {
      setTestResult("请填写必要的字段");
      return;
    }

    try {
      setLoading(true);

      if (isCreating) {
        await addProvider(formData);
      } else {
        await updateProvider(formData.id, formData);
      }

      onSave?.(formData);
    } catch (error) {
      console.error("Failed to save provider:", error);
      setTestResult(`保存失败: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const getDefaultBaseURL = (format: string): string => {
    const defaults: Record<string, string> = {
      openai: "https://api.openai.com/v1",
      qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      anthropic: "https://api.anthropic.com",
    };
    return defaults[format] || "";
  };

  const handleFormatChange = (formats: string[]) => {
    const format = formats[0];
    if (format) {
      setFormData((prev) => ({
        ...prev,
        format: format as any,
        baseUrl: getDefaultBaseURL(format),
      }));
    }
  };

  const handleAddModel = () => {
    if (!newModelName.trim()) return;

    setFormData((prev) => ({
      ...prev,
      models: [...(prev.models || []), newModelName.trim()],
    }));
    setNewModelName("");
  };

  const handleRemoveModel = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      models: prev.models?.filter((_, i) => i !== index) || [],
    }));
  };

  const handleDelete = async () => {
    if (!provider?.id) return;

    try {
      setIsDeleting(true);
      await deleteProvider(provider.id);
      onDelete?.();
    } catch (error) {
      console.error("Failed to delete provider:", error);
      setTestResult(`删除失败: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!provider && !isCreating) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        请选择一个 Provider 进行配置
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex-1 overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">
              {isCreating
                ? "添加新 Provider"
                : `配置 ${formData.name || formData.id}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {isCreating
                ? "创建一个新的 AI Provider 配置"
                : "修改 Provider 的配置信息"}
            </p>
          </div>
          <div className="flex gap-2">
            {!isCreating && provider && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  dialog.confirm({
                    title: "要确定删除吗",
                    onOk() {
                      handleDelete();
                    },
                  });
                }}
                disabled={loading || isDeleting}
              >
                {isDeleting ? (
                  <TbLoader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <TbTrash className="w-4 h-4 mr-2" />
                )}
                删除
              </Button>
            )}
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                取消
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={loading || !formData.name || !formData.baseUrl}
            >
              {loading ? (
                <TbLoader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {isCreating ? "添加" : "保存"}
            </Button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">基本信息</h3>
            <div className="space-y-2">
              <Label htmlFor="name">Provider 名称 *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="例如: my-openai"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="format">Provider 格式 *</Label>
              <DrawerSelector
                title="Provider 格式"
                panelTitle="选择 Provider 格式"
                value={formData.format ? [formData.format] : []}
                items={supportedFormats.map((format) => ({
                  label: format.toUpperCase(),
                  value: format,
                  description: `使用 ${format.toUpperCase()} 格式的 API`,
                  type: "format",
                }))}
                onSelect={handleFormatChange}
                placeholder="选择格式"
                multiple={false}
              />
            </div>
          </div>

          {/* API 配置 */}
          <div className="space-y-4">
            <h3 className="text-base font-medium">API 配置</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="baseUrl">Base URL *</Label>
                <Input
                  id="baseUrl"
                  value={formData.baseUrl || ""}
                  onChange={(e) => handleInputChange("baseUrl", e.target.value)}
                  placeholder="例如: https://api.openai.com/v1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiKey">API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={formData.apiKey || ""}
                  onChange={(e) => handleInputChange("apiKey", e.target.value)}
                  placeholder="输入 API Key"
                />
              </div>
            </div>
          </div>

          {/* 连接测试 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">连接测试</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTest}
                disabled={isTesting || !formData.id || !formData.apiKey}
              >
                {isTesting ? (
                  <TbLoader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                测试连接
              </Button>
            </div>
            {testResult && (
              <div
                className={`flex items-center gap-2 p-2 rounded text-sm ${
                  testResult.includes("成功")
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {testResult.includes("成功") ? (
                  <TbCheck className="w-4 h-4" />
                ) : (
                  <TbX className="w-4 h-4" />
                )}
                {testResult}
              </div>
            )}
          </div>

          {/* 模型管理 */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium">模型管理</h3>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {formData.models?.length || 0} 个模型
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModelsManager(!showModelsManager)}
                >
                  {showModelsManager ? "收起" : "管理模型"}
                </Button>
              </div>
            </div>

            {showModelsManager && (
              <div className="space-y-4 border rounded-lg p-4 bg-muted/30">
                {/* 添加模型 */}
                <div className="flex gap-2">
                  <Input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder="输入模型名称，例如: gpt-4"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddModel();
                      }
                    }}
                  />
                  <Button
                    onClick={handleAddModel}
                    disabled={!newModelName.trim()}
                    size="sm"
                  >
                    <TbPlus className="w-4 h-4 mr-1" />
                    添加
                  </Button>
                </div>

                {/* 模型列表 */}
                {formData.models && formData.models.length > 0 ? (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">已添加的模型</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {formData.models.map((model, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-background border rounded"
                        >
                          <span className="text-sm">{model}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveModel(index)}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <TbTrash className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    暂无模型，请添加模型
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
