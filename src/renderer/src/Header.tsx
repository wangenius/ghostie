import { cn } from "@/lib/utils";
import { ActiveTab, SETTINGS_NAV_ITEMS } from "./App";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./components/ui/tooltip";

export const Header = () => {
  const activeTab = ActiveTab.use();

  return (
    <div className="flex items-center h-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border/40 pl-4 pr-1 z-[10000]">
      {/* macOS 窗口按钮预留空间 */}
      <div className="w-[70px] flex-shrink-0 draggable" />

      {/* 导航按钮组 */}
      <div className="flex items-center">
        <TooltipProvider>
          <div className="flex items-center gap-1">
            {SETTINGS_NAV_ITEMS.map(
              ({ id, label, icon: Icon, divider }, index) => (
                <div key={id} className="flex items-center">
                  {/* 分组分隔符 */}
                  {divider && index > 0 && (
                    <div className="w-px h-4 bg-border/60 mx-1" />
                  )}

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => ActiveTab.set(id as any)}
                        className={cn(
                          "relative flex items-center justify-center size-8 rounded-lg",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-1",
                          activeTab === id
                            ? [
                                "bg-primary text-primary-foreground shadow-md hover:bg-primary/90",
                              ]
                            : [
                                "text-muted-foreground hover:text-foreground hover:bg-background/80 hover:shadow-sm",
                              ],
                        )}
                      >
                        <Icon className={cn("h-5 w-5")} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="bottom"
                      className="text-xs font-medium"
                    >
                      {label}
                    </TooltipContent>
                  </Tooltip>
                </div>
              ),
            )}
          </div>
        </TooltipProvider>
      </div>

      {/* 应用标题 */}
      <div className="flex-1 draggable">
        <h1 className="text-sm font-semibold text-foreground/80 select-none">
          {activeTab}
        </h1>
      </div>
    </div>
  );
};
