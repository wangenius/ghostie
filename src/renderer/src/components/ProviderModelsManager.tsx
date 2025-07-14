import React, { useState, useEffect } from 'react';
import { useProviders } from '../hooks/useProviders';

interface ProviderModelsManagerProps {
  providerName: string;
  onClose?: () => void;
  embedded?: boolean;
}

export const ProviderModelsManager: React.FC<ProviderModelsManagerProps> = ({
  providerName,
  onClose,
  embedded = false,
}) => {
  const { getProviderModels, setProviderModels, getProvider } = useProviders();
  const [models, setModels] = useState<string[]>([]);
  const [newModel, setNewModel] = useState('');
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    loadProviderData();
  }, [providerName]);

  const loadProviderData = async () => {
    try {
      setLoading(true);
      
      // 获取provider信息
      const providerData = await getProvider(providerName);
      setProvider(providerData);
      
      if (providerData) {
        // 获取当前模型列表（只有用户自定义的模型）
        const currentModels = await getProviderModels(providerName);
        setModels(currentModels);
      }
    } catch (error) {
      console.error('加载Provider数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddModel = () => {
    if (newModel.trim() && !models.includes(newModel.trim())) {
      const updatedModels = [...models, newModel.trim()];
      setModels(updatedModels);
      setNewModel('');
    }
  };

  const handleRemoveModel = (modelToRemove: string) => {
    const updatedModels = models.filter(model => model !== modelToRemove);
    setModels(updatedModels);
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // 直接保存用户的自定义模型列表
      await setProviderModels(providerName, models);
      if (!embedded && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('保存模型列表失败:', error);
      alert('保存失败: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const clearAllModels = () => {
    setModels([]);
  };

  if (loading && !provider) {
    return embedded ? (
      <div className="text-center py-4">加载中...</div>
    ) : (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">加载中...</div>
        </div>
      </div>
    );
  }

  const content = (
    <>
      {!embedded && (
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">管理 {provider?.displayName} 的模型</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
      )}

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            格式: {provider?.format}
          </p>
          <p className="text-sm text-gray-600 mb-4">
            请手动添加您需要使用的模型名称。
          </p>
        </div>

        <div className="mb-4">
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="输入模型名称"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddModel()}
            />
            <button
              onClick={handleAddModel}
              disabled={!newModel.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-300"
            >
              添加
            </button>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">自定义模型列表</h3>
            <button
              onClick={clearAllModels}
              className="text-sm text-red-500 hover:text-red-700"
            >
              清空所有
            </button>
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-md">
            {models.length === 0 ? (
              <div className="p-3 text-gray-500 text-center">暂无自定义模型，请添加模型</div>
            ) : (
              models.map((model, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-2 border-b border-gray-100 last:border-b-0"
                >
                  <span className="text-sm">{model}</span>
                  <button
                    onClick={() => handleRemoveModel(model)}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    删除
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300"
          >
            {loading ? '保存中...' : '保存'}
          </button>
          {!embedded && onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              取消
            </button>
          )}
        </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-y-auto">
        {content}
      </div>
    </div>
  );
};