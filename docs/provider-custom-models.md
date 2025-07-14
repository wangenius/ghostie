# Provider 自定义模型功能

## 概述

本功能允许用户为每个 Provider 配置完全自定义的模型列表。系统不提供预设的默认模型，用户需要手动添加所需的模型名称，提供最大的灵活性。这个功能允许您：

- 为不同的 Provider 手动添加自定义模型
- 完全控制每个 Provider 的模型列表
- 灵活管理每个 Provider 支持的模型

## 功能特性

### 1. 自定义模型列表

每个 Provider 配置现在支持 `customModels` 字段：

```typescript
interface ProviderConfig {
  name: string;
  format: 'openai' | 'qwen' | 'anthropic';
  displayName: string;
  description?: string;
  apiKey?: string;
  baseURL?: string;
  customModels?: string[]; // 新增：用户自定义的模型列表
}
```

### 2. 自定义模型管理

- Provider 必须配置 `customModels` 才能使用模型
- 如果没有配置 `customModels` 或列表为空，该 Provider 将没有可用模型
- 用户需要手动添加所需的模型名称

### 3. 新增 IPC 通道

#### `provider-get-models`
获取特定 Provider 的模型列表（包括自定义模型）

```typescript
// 参数: [providerName: string]
// 返回: string[]
const models = await cmd.invoke('provider-get-models', 'my-custom-openai');
```

#### `provider-set-models`
设置 Provider 的自定义模型列表

```typescript
// 参数: [providerName: string, models: string[]]
// 返回: void
await cmd.invoke('provider-set-models', 'my-custom-openai', [
  'gpt-4o',
  'gpt-4o-mini',
  'my-custom-model'
]);
```

## 使用方法

### 1. 通过 useProviders Hook

```typescript
import { useProviders } from '../hooks/useProviders';

const {
  getProviderModels,
  setProviderModels,
  getCommonModels
} = useProviders();

// 获取 Provider 的模型列表
const models = await getProviderModels('my-provider');

// 设置自定义模型列表
await setProviderModels('my-provider', [
  'custom-model-1',
  'custom-model-2'
]);

// 注意：不再有默认模型，用户必须手动配置
// const defaultModels = await getCommonModels('openai'); // 此功能已移除
```

### 2. 使用 ProviderModelsManager 组件

我们提供了一个现成的 React 组件来管理 Provider 的模型：

```typescript
import { ProviderModelsManager } from '../components/ProviderModelsManager';

function MyComponent() {
  const [showModelsManager, setShowModelsManager] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');

  return (
    <div>
      <button onClick={() => {
        setSelectedProvider('my-provider');
        setShowModelsManager(true);
      }}>
        管理模型
      </button>

      {showModelsManager && (
        <ProviderModelsManager
          providerName={selectedProvider}
          onClose={() => setShowModelsManager(false)}
        />
      )}
    </div>
  );
}
```

## 常见模型参考

以下是一些常见的模型名称供参考，用户需要手动添加到自定义模型列表中：

### OpenAI 格式参考
- gpt-4o
- gpt-4o-mini
- gpt-4-turbo
- gpt-3.5-turbo

### Anthropic 格式参考
- claude-3-5-sonnet-20241022
- claude-3-5-haiku-20241022
- claude-3-opus-20240229

### Qwen 格式参考
- qwen-turbo
- qwen-plus
- qwen-max

## 实现细节

### 后端实现

1. **ProviderConfig 接口扩展**：添加了 `customModels` 字段
2. **新增 IPC 处理器**：
   - `getProviderModelsList`: 获取 Provider 的模型列表
   - `setProviderModels`: 设置 Provider 的自定义模型
3. **自定义模型管理逻辑**：仅使用用户配置的自定义模型，不提供默认模型

### 前端实现

1. **useProviders Hook 扩展**：添加了模型管理相关方法
2. **ProviderModelsManager 组件**：提供用户友好的模型管理界面
3. **类型定义更新**：在 channels.ts 中添加了新的 IPC 通道定义

## 注意事项

1. **模型验证**：系统不会验证自定义模型名称的有效性，请确保模型名称正确
2. **持久化存储**：自定义模型列表会自动保存到 Provider 配置中
3. **重置功能**：可以通过设置空数组来清空模型列表（注意：这将导致该 Provider 无可用模型）
4. **兼容性**：现有的 Provider 配置如果没有自定义模型，将需要手动添加模型才能使用

## 示例场景

### 场景 1：添加自定义 OpenAI 兼容模型

```typescript
// 为自定义 OpenAI 兼容 API 添加特定模型
await setProviderModels('my-local-llm', [
  'llama-3.1-70b',
  'llama-3.1-8b',
  'codellama-34b'
]);
```

### 场景 2：限制可用模型

```typescript
// 只允许使用特定的 GPT 模型
await setProviderModels('restricted-openai', [
  'gpt-4o-mini'
]);
```

### 场景 3：清空模型列表

```typescript
// 清空自定义模型（注意：这将导致该 Provider 无可用模型）
await setProviderModels('my-provider', []);
```

这个功能为用户提供了更大的灵活性，可以根据实际需求定制每个 Provider 的可用模型列表。