import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { memo, useState, useEffect } from "react";
import { Provider, ModelType } from "@/hooks/useModels";

export const ModelItem = memo(
  ({
    provider,
    getApiKey,
    setApiKey,
  }: {
    provider: Provider;
    getApiKey?: (provider: string) => Promise<string>;
    setApiKey?: (provider: string, key: string) => Promise<void>;
  }) => {
    const [apiKey, setApiKeyState] = useState<string>("");
    const [baseUrl, setBaseUrlState] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    // 获取API密钥和BaseURL
    useEffect(() => {
      const fetchSettings = async () => {
        if (getApiKey && provider.name) {
          try {
            const key = await getApiKey(provider.name);
            setApiKeyState(key);
          } catch (error) {
            console.error("获取API密钥失败:", error);
          }
        }
      };

      fetchSettings();
    }, [provider.name, getApiKey]);

    // 处理API密钥变更
    const handleApiKeyChange = async (value: string) => {
      setApiKeyState(value);
      
      if (setApiKey && provider.name) {
        try {
          setIsLoading(true);
          await setApiKey(provider.name, value);
        } catch (error) {
          console.error("设置API密钥失败:", error);
        } finally {
          setIsLoading(false);
        }
      }
    };

    // 获取模型类型的显示名称
    const getTypeDisplayName = (type: ModelType) => {
      switch (type) {
        case ModelType.CHAT:
          return "聊天";
        case ModelType.IMAGE:
          return "图像";
        case ModelType.AUDIO:
          return "音频";
        case ModelType.VISION:
          return "视觉";
        case ModelType.EMBEDDING:
          return "嵌入";
        default:
          return type;
      }
    };

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-2 space-y-6">
          {/* 提供商头部信息 */}
          <div className="flex items-center gap-4">
            {provider.icon ? (
              <img
                src={`/${provider.icon}`}
                className="w-16 h-16 p-2 rounded-lg bg-muted"
                alt={provider.displayName || provider.name}
              />
            ) : (
              <div className="w-16 h-16 p-2 rounded-lg bg-muted flex items-center justify-center text-2xl font-bold">
                {provider.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="flex-1">
              <h1 className="text-2xl font-medium">
                {provider.displayName || provider.name}
              </h1>
              {provider.description && (
                <p className="text-muted-foreground mt-1">
                  {provider.description}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Badge variant="outline">
                {provider.name}
              </Badge>
              {provider.requiresApiKey && (
                <Badge variant="secondary">
                  需要API密钥
                </Badge>
              )}
            </div>
          </div>

          {/* 支持的模型类型 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              支持的模型类型
            </label>
            <div className="flex flex-wrap gap-2">
              {provider.supportedTypes.map((type) => (
                <Badge key={type} variant="outline">
                  {getTypeDisplayName(type)}
                </Badge>
              ))}
            </div>
          </div>

          {/* 默认BaseURL */}
          {provider.defaultBaseUrl && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                默认BaseURL
              </label>
              <div className="p-3 bg-muted rounded-lg">
                <code className="text-sm font-mono">
                  {provider.defaultBaseUrl}
                </code>
              </div>
            </div>
          )}

          {/* API密钥配置 */}
          {provider.requiresApiKey && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                API密钥
              </label>
              <Input
                type="password"
                spellCheck={false}
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="请输入API密钥"
                className="font-mono h-10"
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground">
                API密钥将被安全存储，用于访问 {provider.displayName || provider.name} 的服务
              </p>
            </div>
          )}

          {/* 使用说明 */}
          <div className="space-y-3">
            <label className="text-sm font-medium text-muted-foreground">
              使用说明
            </label>
            <div className="p-4 bg-muted/50 rounded-lg space-y-2 text-sm">
              <p>
                这是一个 <strong>{provider.displayName || provider.name}</strong> 模型提供商。
              </p>
              <p>
                支持的模型类型：{provider.supportedTypes.map(type => getTypeDisplayName(type)).join("、")}
              </p>
              {provider.requiresApiKey && (
                <p>
                  使用前请先配置API密钥。
                </p>
              )}
              <p>
                配置完成后，您可以在创建Agent时选择使用此提供商的模型。
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
