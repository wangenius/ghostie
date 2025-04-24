import { ContextRuntimeProps } from "@/agent/context/Runtime";
import { CONTEXT_RUNTIME_DATABASE } from "@/assets/const";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Echo } from "echo-state";
import { TbClock, TbMessageCircle, TbTrash } from "react-icons/tb";

export const HistoryPage = ({
  onClick,
  agent,
}: {
  onClick: (item: ContextRuntimeProps) => void;
  agent: string;
}) => {
  return (
    <div className="flex flex-col h-full">
      <Button
        variant="destructive"
        className="flex-none"
        onClick={() => {
          Echo.get<Record<string, ContextRuntimeProps>>({
            database: CONTEXT_RUNTIME_DATABASE,
            name: agent,
          }).discard();
        }}
      >
        <TbTrash className="h-4 w-4" />
        delete all
      </Button>

      {Object.entries(history)
        .filter(([_, value]) => value.agent === agent)
        .sort(
          (a, b) =>
            new Date(b[1].created_at).getTime() -
            new Date(a[1].created_at).getTime(),
        )
        .map(([key, value]) => (
          <div
            key={key}
            onClick={() => {
              onClick(value);
            }}
            className={cn(
              "p-2 rounded-lg cursor-pointer transition-colors group",
              "hover:bg-muted-foreground/10",
            )}
          >
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-muted-foreground">
                <TbClock className="h-4 w-4" />
                <span className="text-xs">
                  {new Date(value.created_at).toLocaleString("zh-CN", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              <Button
                onClick={async (e) => {
                  e.stopPropagation();
                  const echo = Echo.get<Record<string, ContextRuntimeProps>>({
                    database: CONTEXT_RUNTIME_DATABASE,
                    name: agent,
                  });
                  await echo.ready();
                  echo.delete(key);
                }}
                variant="ghost"
                size="icon"
                className="h-5 w-5 p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <TbTrash className="h-4 w-4" />
              </Button>
            </div>
            <h3 className="text-xs my-1 font-medium line-clamp-2 ">
              {value.messages[0]?.content}
            </h3>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TbMessageCircle className="h-3.5 w-3.5" />
              <span>{value.messages.length} messages</span>
            </div>
          </div>
        ))}
    </div>
  );
};
