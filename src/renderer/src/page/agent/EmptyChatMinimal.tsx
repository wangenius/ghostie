export function EmptyChatMinimal({ agent }: any) {
  const plugins = [];
  const actived = [];
  const workflows = [];
  const knowledges = [];

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h3 className="text-lg font-semibold mb-2 text-foreground">
        开始与 {agent?.infos.name || "AI助手"} 对话
      </h3>
    </div>
  );
}
