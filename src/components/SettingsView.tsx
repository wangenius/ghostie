import { Bot, Database, Settings as SettingsIcon, X } from "lucide-react";
import { BotsTab } from "./settings/BotsTab";
import { GeneralTab } from "./settings/GeneralTab";
import { ModelsTab } from "./settings/ModelsTab";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  activeTab: "general" | "models" | "bots";
}

const NAV_ITEMS = [
  { id: 'general', label: '通用', icon: SettingsIcon },
  { id: 'models', label: '模型', icon: Database },
  { id: 'bots', label: '机器人', icon: Bot },
] as const;

export function SettingsView({ isOpen, onClose, embedded = false, activeTab }: Props) {
  const renderContent = () => {
    switch (activeTab) {
      case "models":
        return <ModelsTab />;
      case "bots":
        return <BotsTab />;
      default:
        return <GeneralTab />;
    }
  };

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <div className="p-4">
          {renderContent()}
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return <div className="h-full bg-white">{content}</div>;
  }

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none opacity-0'}`}>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[50%] z-[90] max-w-xl translate-y-[-50%] mx-auto">
        <div className="relative bg-white rounded-xl shadow-2xl">
          <div className="h-[85vh] overflow-hidden">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
