import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { Echoi } from "@/lib/echo/Echo";
import { cn } from "@/lib/utils";
import { gen } from "@/utils/generator";
import { motion } from "framer-motion";
import { useState } from "react";
import { TbDatabasePlus, TbPlug, TbPlus } from "react-icons/tb";
import { EnvEditor } from "../plugins/EnvEditor";

interface DatabaseProps {
  id: string;
  name: string;
  descriptions: string;
}

const DatabasesStore = new Echoi<Record<string, DatabaseProps>>({}).indexed({
  database: "DATABASE_INDEX",
  name: "index",
});

const Database = new Echoi<Record<string, any>>({}).indexed({
  database: "DATABASE_BODY",
  name: "",
});

export function DatabaseTab() {
  const [tab, setTab] = useState("env");
  const bases = DatabasesStore.use();
  return (
    <PreferenceLayout>
      <PreferenceList
        right={
          <>
            <Button
              onClick={() => {
                const id = gen.id();
                DatabasesStore.set({
                  [id]: {
                    id,
                    name: "",
                    descriptions: "",
                  },
                });
              }}
              className="flex-1"
            >
              <TbDatabasePlus className="w-4 h-4" />
            </Button>
          </>
        }
        items={[
          {
            id: "env",
            content: "环境变量",
            actived: tab === "env",
            onClick() {
              setTab("env");
            },
            noRemove: true,
          },
          ...Object.values(bases).map((item) => ({
            id: item.id,
            content: item.name,
            actived: tab === item.id,
            onClick: () => {
              setTab(item.id);
            },
            noRemove: true,
          })),
        ]}
        emptyText="数据库"
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
              <h3 className="text-base font-semibold">数据库</h3>
            </div>
          }
        >
          <div>
            {tab === "env" ? (
              <EnvEditor />
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold">数据库</h3>
                  <Button>
                    <TbPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </PreferenceBody>
      </motion.div>
    </PreferenceLayout>
  );
}
