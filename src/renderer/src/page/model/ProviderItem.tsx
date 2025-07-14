import { ProviderModelsManager } from "@/components/ProviderModelsManager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProviderConfigItem, useProviders } from "@/hooks/useProviders";
import { memo, useEffect, useState } from "react";
import { TbCheck, TbLoader2, TbSettings } from "react-icons/tb";

export const ProviderItem = memo(
  ({ provider }: { provider: ProviderConfigItem }) => {
    const [apiKey, setApiKeyState] = useState<string>(provider.apiKey || "");
    const [baseURL, setBaseURLState] = useState<string>(provider.baseURL || "");
    const [selectedModel, setSelectedModel] = useState<string>("");
    const [commonModels, setCommonModels] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const [hasChanges, setHasChanges] = useState(false);
    const [showModelsManager, setShowModelsManager] = useState(false);

    const { setProviderConfig, testProvider, getProviderModels } =
      useProviders();

    // 获取自定义模型列表
    useEffect(() => {
      const fetchModels = async () => {
        const models = await getProviderModels(provider.name);
        setCommonModels(models);
        if (models.length > 0) {
          setSelectedModel(models[0]);
        }
      };
      fetchModels();
    }, [provider.name, getProviderModels, showModelsManager]);

    // 监听配置变化
    useEffect(() => {
      const hasApiKeyChange = apiKey !== (provider.apiKey || "");
      const hasBaseURLChange = baseURL !== (provider.baseURL || "");
      setHasChanges(hasApiKeyChange || hasBaseURLChange);
    }, [apiKey, baseURL, provider.apiKey, provider.baseURL]);

    // 保存配置
    const handleSave = async () => {
      try {
        setIsLoading(true);
        await setProviderConfig(provider.name, {
          apiKey: apiKey || undefined,
          baseURL: baseURL || undefined,
        });
        setHasChanges(false);
      } catch (error) {
        console.error("保存配置失败:", error);
      } finally {
        setIsLoading(false);
      }
    };

    // 重置配置
    const handleReset = () => {
      setApiKeyState(provider.apiKey || "");
      setBaseURLState(provider.baseURL || "");
      setHasChanges(false);
    };

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-6 space-y-6">
          {/* Provider头部信息 */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 p-2 rounded-lg bg-muted flex items-center justify-center text-2xl font-bold">
              {provider.displayName.charAt(0).toUpperCase()}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-medium">{provider.displayName}</h1>
              {provider.description && (
                <p className="text-muted-foreground mt-1">
                  {provider.description}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Badge variant="outline">{provider.format.toUpperCase()}</Badge>
              <Badge variant="secondary">{provider.name}</Badge>
            </div>
          </div>

          {/* 配置表单 */}
          <Card>
            <CardHeader>
              <CardTitle>Provider 配置</CardTitle>
              <CardDescription>
                配置 {provider.displayName} 的连接参数
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key */}
              <div className="space-y-2">
                <label className="text-sm font-medium">API Key</label>
                <Input
                  type="password"
                  spellCheck={false}
                  value={apiKey}
                  onChange={(e) => setApiKeyState(e.target.value)}
                  placeholder="请输入API Key"
                  className="font-mono"
                />
              </div>

              {/* Base URL */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Base URL</label>
                <Input
                  type="url"
                  spellCheck={false}
                  value={baseURL}
                  onChange={(e) => setBaseURLState(e.target.value)}
                  placeholder={`默认: ${getDefaultBaseURL(provider.format)}`}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">留空使用默认URL</p>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={handleSave}
                  disabled={!hasChanges || isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <TbLoader2 className="w-4 h-4 mr-2 animate-spin" />
                      保存中...
                    </>
                  ) : (
                    <>
                      <TbCheck className="w-4 h-4 mr-2" />
                      保存配置
                    </>
                  )}
                </Button>

                {hasChanges && (
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    重置
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 模型管理 */}
          <Card>
            <CardHeader>
              <CardTitle>模型管理</CardTitle>
              <CardDescription>
                管理 {provider.displayName} 的自定义模型列表
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showModelsManager ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    您可以为此 Provider 添加自定义模型名称，这些模型将在创建
                    Agent 时可供选择。
                  </p>
                  <Button
                    onClick={() => setShowModelsManager(true)}
                    variant="outline"
                    className="w-full"
                  >
                    <TbSettings className="w-4 h-4 mr-2" />
                    管理模型列表
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">自定义模型列表</h4>
                    <Button
                      onClick={() => setShowModelsManager(false)}
                      variant="ghost"
                      size="sm"
                    >
                      收起
                    </Button>{" "}
                  </div>
                  <ProviderModelsManager
                    providerName={provider.name}
                    onClose={() => setShowModelsManager(false)}
                    embedded={true}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* 使用说明 */}
          <Card>
            <CardHeader>
              <CardTitle>使用说明</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p>
                这是一个 <strong>{provider.displayName}</strong> Provider，使用{" "}
                <strong>{provider.format.toUpperCase()}</strong> 格式的API。
              </p>
              <p>
                请先在模型管理中添加您需要使用的模型名称，然后配置API密钥等连接参数。
              </p>
              <p>
                配置完成后，您可以在创建Agent时选择使用此Provider的自定义模型。
              </p>
              <p>建议在添加模型和保存配置后进行连接测试，确保配置正确。</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  },
);

// 获取默认BaseURL
function getDefaultBaseURL(format: string): string {
  switch (format) {
    case "openai":
      return "https://api.openai.com/v1";
    case "anthropic":
      return "https://api.anthropic.com";
    case "qwen":
      return "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
    default:
      return "";
  }
}
