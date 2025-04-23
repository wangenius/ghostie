import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { TbPlug, TbPlus, TbScriptPlus } from "react-icons/tb";

export function DatabaseTab() {
  return (
    <PreferenceLayout>
      <PreferenceList
        right={
          <>
            <Button className="flex-1">
              <TbScriptPlus className="w-4 h-4" />
              新建
            </Button>
          </>
        }
        items={[]}
        emptyText="暂无计划，点击上方按钮添加新计划"
        EmptyIcon={TbPlus}
      />
      <motion.div
        layout
        className={cn("flex flex-1 flex-col h-full overflow-hidden")}
        initial={false}
        animate={{
          scale: 1,
          opacity: 1,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
      >
        <PreferenceBody
          emptyText="请选择一个计划或点击添加按钮创建新计划"
          EmptyIcon={TbPlug}
          isEmpty={false}
          className={cn("rounded-xl flex-1")}
          header={
            <div className="flex items-center justify-between w-full">
              <h3 className="text-base font-semibold">未命名计划</h3>
            </div>
          }
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-6">
                <div>
                  <div className="space-y-4">
                    <Label>触发器描述</Label>
                    <div className="space-y-2">
                      <Input
                        value={""}
                        onChange={() => {}}
                        placeholder="输入工作流描述用于LLM触发"
                        className="resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </PreferenceBody>
      </motion.div>
    </PreferenceLayout>
  );
}
