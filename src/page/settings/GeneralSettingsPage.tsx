import { AuthSettings } from "./components/AuthSettings";
import {
  AutoStartSettings,
  ConfigDirSettings,
  DenoSettings,
  FontSettings,
  ProxySettings,
  ThemeSettings,
  UpdateSettings,
} from "./components/SystemSettings";
import {
  MaxHistorySettings,
  ReactMaxIterationsSettings,
} from "./components/ChatAgentSettings";
import {
  KnowledgeModelSettings,
  KnowledgeThresholdSettings,
} from "./components/KnowledgeSettings";

export function GeneralSettingsPage() {
  return (
    <div className="space-y-2 max-w-screen-lg mx-auto px-4 h-full overflow-y-auto">
      <h3 className="text-lg font-bold">Account</h3>
      <AuthSettings />
      <h3 className="text-lg font-bold pt-6">System</h3>
      <ThemeSettings />
      <FontSettings />
      <AutoStartSettings />
      <DenoSettings />
      <UpdateSettings />
      <ProxySettings />
      <ConfigDirSettings />
      <h3 className="text-lg font-bold pt-6">ChatAgent</h3>
      <MaxHistorySettings />
      <ReactMaxIterationsSettings />
      <h3 className="text-lg font-bold pt-6">Knowledge</h3>
      <KnowledgeModelSettings />
      <KnowledgeThresholdSettings />
    </div>
  );
}
