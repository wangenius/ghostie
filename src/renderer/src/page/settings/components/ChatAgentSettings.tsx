import { Slider } from "@/components/ui/slider";
import { TbArrowIteration, TbHistory } from "react-icons/tb";
import { SettingItem } from "./SettingItem";
import { SettingsManager } from "../../../settings/SettingsManager";

export function ReactMaxIterationsSettings() {
  const settings = SettingsManager.use();

  return (
    <SettingItem
      icon={<TbArrowIteration className="w-[18px] h-[18px]" />}
      title="ReActMaxIterations"
      titleClassName="font-bold"
      description={`Agent task maximum iterations, current: ${settings.reActMaxIterations}`}
      action={
        <Slider
          value={[settings.reActMaxIterations]}
          onValueChange={(value) => {
            SettingsManager.setReactMaxIterations(value[0]);
          }}
          min={5}
          max={20}
          step={1}
          className="w-32"
        />
      }
    />
  );
}

export function MaxHistorySettings() {
  const settings = SettingsManager.use();

  return (
    <SettingItem
      icon={<TbHistory className="w-[18px] h-[18px]" />}
      title="MaxHistoryMessageNumber"
      titleClassName="w-full"
      description={`Maximum number of context messages in the conversation, current: ${settings.maxHistory}`}
      action={
        <Slider
          value={[settings.maxHistory]}
          onValueChange={(value) => {
            SettingsManager.setMaxHistory(value[0]);
          }}
          min={20}
          max={120}
          step={1}
          className="w-32"
        />
      }
    />
  );
}
