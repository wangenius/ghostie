import { useAgent } from "@/hooks/useAgent";

type AgentInfos = NonNullable<ReturnType<typeof useAgent>['agents'][string]>;

interface EmptyChatMinimalProps {
  agent?: AgentInfos;
}

export function EmptyChatMinimal({ agent }: EmptyChatMinimalProps) {
  const plugins = [];
  const actived = [];
  const workflows = [];
  const knowledges = [];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h3 className="text-lg font-semibold mb-2 text-foreground">
        开始与 {agent?.name || "AI助手"} 对话
      </h3>
    </div>
  );
}
