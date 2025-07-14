import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useProviders, ProviderConfigItem } from "@/hooks/useProviders";
import { TbCheck, TbX, TbLoader } from "react-icons/tb";

interface ProviderConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  provider?: ProviderConfigItem;
  mode: 'add' | 'edit';
}

export function ProviderConfigDialog({ open, onOpenChange, provider, mode }: ProviderConfigDialogProps) {
  const [formData, setFormData] = useState<ProviderConfigItem>({
    name: '',
    format: 'openai',
    displayName: '',
    description: '',
    apiKey: '',
    baseURL: '',
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const { addCustomProvider, updateProvider, testProvider, getSupportedFormats } = useProviders();
  const [supportedFormats, setSupportedFormats] = useState<string[]>([]);

  useEffect(() => {
    if (provider && mode === 'edit') {
      setFormData(provider);
    } else {
      setFormData({
        name: '',
        format: 'openai',
        displayName: '',
        description: '',
        apiKey: '',
        baseURL: '',
      });
    }
    setTestResult(null);
  }, [provider, mode, open]);

  useEffect(() => {
    if (open) {
      getSupportedFormats().then(setSupportedFormats);
    }
  }, [open, getSupportedFormats]);

  const handleInputChange = (field: keyof ProviderConfigItem, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // 清除测试结果当配置改变时
  };

  const handleTest = async () => {
    if (!formData.name || !formData.apiKey) {
      setTestResult({ success: false, error: '请填写Provider名称和API密钥' });
      return;
    }

    setTesting(true);
    try {
      const result = await testProvider(formData);
      setTestResult(result);
    } catch (error) {
      setTestResult({ success: false, error: '测试连接失败' });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.displayName || !formData.apiKey) {
      setTestResult({ success: false, error: '请填写必要的字段' });
      return;
    }

    setSaving(true);
    try {
      if (mode === 'add') {
        await addCustomProvider(formData);
      } else {
        await updateProvider(formData.name, formData);
      }
      onOpenChange(false);
    } catch (error) {
      setTestResult({ 
        success: false, 
        error: error instanceof Error ? error.message : '保存失败' 
      });
    } finally {
      setSaving(false);
    }
  };

  const getDefaultBaseURL = (format: string) => {
    switch (format) {
      case 'openai':
        return 'https://api.openai.com/v1';
      case 'anthropic':
        return 'https://api.anthropic.com';
      case 'qwen':
        return 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
      default:
        return '';
    }
  };

  const handleFormatChange = (format: string) => {
    setFormData(prev => ({
      ...prev,
      format: format as 'openai' | 'qwen' | 'anthropic',
      baseURL: prev.baseURL || getDefaultBaseURL(format)
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'add' ? '添加Provider' : '编辑Provider'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Provider名称 *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              placeholder="例如: my-openai"
              disabled={mode === 'edit'}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Provider格式 *</Label>
            <Select value={formData.format} onValueChange={handleFormatChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {supportedFormats.map(format => (
                  <SelectItem key={format} value={format}>
                    {format.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">显示名称 *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => handleInputChange('displayName', e.target.value)}
              placeholder="例如: 我的OpenAI"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Provider描述（可选）"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API密钥 *</Label>
            <Input
              id="apiKey"
              type="password"
              value={formData.apiKey || ''}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              placeholder="输入API密钥"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="baseURL">Base URL</Label>
            <Input
              id="baseURL"
              value={formData.baseURL || ''}
              onChange={(e) => handleInputChange('baseURL', e.target.value)}
              placeholder={getDefaultBaseURL(formData.format)}
            />
          </div>

          {/* 测试结果 */}
          {testResult && (
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <>
                  <TbCheck className="text-green-500" />
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    连接测试成功
                  </Badge>
                </>
              ) : (
                <>
                  <TbX className="text-red-500" />
                  <Badge variant="outline" className="text-red-600 border-red-200">
                    {testResult.error || '连接测试失败'}
                  </Badge>
                </>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={testing || !formData.name || !formData.apiKey}
              className="flex-1"
            >
              {testing ? (
                <>
                  <TbLoader className="mr-2 h-4 w-4 animate-spin" />
                  测试中...
                </>
              ) : (
                '测试连接'
              )}
            </Button>
            
            <Button
              onClick={handleSave}
              disabled={saving || !formData.name || !formData.displayName || !formData.apiKey}
              className="flex-1"
            >
              {saving ? (
                <>
                  <TbLoader className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                mode === 'add' ? '添加' : '保存'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}