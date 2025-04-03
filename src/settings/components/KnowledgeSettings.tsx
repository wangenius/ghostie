import { Slider } from "@/components/ui/slider";
import { DrawerSelector } from "@/components/ui/drawer-selector";
import { TbDatabase } from "react-icons/tb";
import { SettingItem } from "./SettingItem";
import { SettingsManager } from "../SettingsManager";
import { EmbeddingModelManager } from "@/model/embedding/EmbeddingModelManger";

export function KnowledgeModelSettings() {
  const { knowledge } = SettingsManager.use();

  // 转换模型数据为 DrawerSelectorItem 格式
  const modelItems = Object.values(
    EmbeddingModelManager.getProviders(),
  ).flatMap((provider) => {
    const models = provider.models;
    return Object.values(models).map((model) => ({
      label: model.name,
      value: `${provider.name}:${model.name}`,
      type: provider.name,
    }));
  });

  return (
    <>
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Knowledge Content Model"
        description="Model used to parse text, recommended for asynchronous batch processing model"
        action={
          <DrawerSelector
            value={[knowledge.baseModel]}
            items={modelItems}
            onSelect={(value: string[]) => {
              SettingsManager.setKnowledge({ baseModel: value[0] });
            }}
            placeholder="Select Model"
          />
        }
      />
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Knowledge Search Model"
        description="Model used to vectorize search terms, recommended for synchronous model"
        action={
          <DrawerSelector
            value={[knowledge.searchModel]}
            items={modelItems}
            onSelect={(value: string[]) => {
              SettingsManager.setKnowledge({ searchModel: value[0] });
            }}
            placeholder="Select Model"
          />
        }
      />
    </>
  );
}

export function KnowledgeThresholdSettings() {
  const { knowledge } = SettingsManager.use();

  return (
    <>
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Similarity Threshold"
        description={`Current: ${(knowledge.threshold * 100).toFixed(0)}%`}
        action={
          <Slider
            value={[knowledge.threshold]}
            min={0}
            max={1}
            step={0.1}
            onValueChange={([value]) =>
              SettingsManager.setKnowledge({ threshold: value })
            }
            className="w-32"
          />
        }
      />
      <SettingItem
        icon={<TbDatabase className="w-[18px] h-[18px]" />}
        title="Result Number"
        description={`Current: ${knowledge.limit}`}
        action={
          <Slider
            value={[knowledge.limit]}
            min={1}
            max={50}
            step={1}
            onValueChange={([value]) =>
              SettingsManager.setKnowledge({ limit: value })
            }
            className="w-32"
          />
        }
      />
    </>
  );
}
