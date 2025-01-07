import { SettingsTab } from "../types";
import { AgentsTab } from "./settings/AgentsTab";
import { BotsTab } from "./settings/BotsTab";
import { GeneralTab } from "./settings/GeneralTab";
import { ModelsTab } from "./settings/ModelsTab";
import { PluginsTab } from "./settings/PluginsTab";
import { SpaceTab } from "./settings/SpaceTab";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  embedded?: boolean;
  activeTab: SettingsTab;
}

export function SettingsView({ isOpen, onClose, embedded = false, activeTab }: Props) {
  const renderContent = () => {
    switch (activeTab) {
      case "models":
        return <ModelsTab />;
      case "bots":
        return <BotsTab />;
      case "agents":
        return <AgentsTab />;
      case "plugins":
        return <PluginsTab />;
      case "space":
        return <SpaceTab />;
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
    return <div className="h-full bg-background">{content}</div>;
  }

  return (
    <div className={`fixed inset-0 z-[90] ${isOpen ? '' : 'pointer-events-none opacity-0'}`}>
      <div className="fixed inset-0 bg-background/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-x-4 top-[50%] z-[90] max-w-xl translate-y-[-50%] mx-auto">
        <div className="relative bg-background rounded-xl shadow-2xl">
          <div className="h-[85vh] overflow-hidden">
            {content}
          </div>
        </div>
      </div>
    </div>
  );
}
