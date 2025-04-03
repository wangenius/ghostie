import { Button } from "@/components/ui/button";
import { gen } from "@/utils/generator";
import { cmd } from "@utils/shell";
import { PiDotsThreeBold, PiStorefrontDuotone } from "react-icons/pi";
import { TbDownload, TbPlus, TbRobot, TbUpload } from "react-icons/tb";

import { defaultBot } from "@/bot/Bot";
import { BotManager } from "@/bot/BotManger";
import { BotProps } from "@/bot/types/bot";
import { dialog } from "@/components/custom/DialogModal";
import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getColor } from "@/utils/color";
import { Echo } from "echo-state";
import { useEffect } from "react";
import { BotEditor } from "./BotEditor";
import { BotsMarket } from "./BotsMarket";

export const BotSelect = new Echo<BotProps | null>(null);
/** 机器人列表 */
export function BotsTab() {
  const bots = BotManager.use();
  const selectedBot = BotSelect.use();

  // 自动保存功能
  useEffect(() => {
    if (selectedBot?.id) {
      try {
        BotManager.update(selectedBot);
      } catch (error) {
        console.error("update bot error:", error);
      }
    }
  }, [selectedBot]);

  const handleCreateBot = () => {
    try {
      const id = gen.id();
      const newBot = { ...defaultBot, id };
      BotManager.add(newBot);
      BotSelect.set(newBot);
    } catch (error) {
      console.error("add bot error:", error);
    }
  };

  const handleDeleteBot = async (id: string) => {
    const answer = await cmd.confirm(
      `Are you sure you want to delete the assistant "${bots[id].name}"?`,
    );
    if (answer) {
      try {
        BotManager.remove(id);
        if (selectedBot?.id === id) {
          BotSelect.set(null);
        }
      } catch (error) {
        console.error("delete bot error:", error);
      }
    }
  };

  const handleImport = async () => {
    try {
      const result = await cmd.invoke<{ path: string; content: string }>(
        "open_file",
        {
          title: "Select Assistant Configuration File",
          filters: {
            "Assistant Configuration": ["json"],
          },
        },
      );

      if (result) {
        BotManager.import(result.content);
        await cmd.message(
          "Successfully imported assistant configuration",
          "import success",
        );
      }
    } catch (error) {
      console.error("import bot error:", error);
      await cmd.message(`import bot error: ${error}`, "import failed");
    }
  };

  const handleExport = async () => {
    try {
      const botsJson = BotManager.export();
      const result = await cmd.invoke<boolean>("save_file", {
        title: "Save Assistant Configuration",
        filters: {
          "Assistant Configuration": ["json"],
        },
        defaultName: "bots.json",
        content: botsJson,
      });

      if (result) {
        await cmd.message(
          "Successfully exported assistant configuration",
          "export success",
        );
      }
    } catch (error) {
      console.error("export bot error:", error);
      await cmd.message(`export bot error: ${error}`, "export failed");
    }
  };

  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        left={
          <Button
            onClick={() => {
              dialog({
                title: "Bots Market",
                content: <BotsMarket />,
                className: "max-w-3xl",
              });
            }}
            className="bg-muted-foreground/10 hover:bg-muted-foreground/20"
          >
            <PiStorefrontDuotone className="w-4 h-4" />
            Bots Market
          </Button>
        }
        right={
          <>
            <Button className="flex-1" onClick={handleCreateBot}>
              <TbPlus className="w-4 h-4" />
              New
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <PiDotsThreeBold className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleImport}>
                  <TbUpload className="w-4 h-4 mr-2" />
                  <span>Import</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleExport}>
                  <TbDownload className="w-4 h-4 mr-2" />
                  <span>Export</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        }
        items={Object.entries(bots).map(([id, bot]) => ({
          id,
          title: (
            <span className="flex items-center">
              <span>{bot.name || "Unnamed Bot"}</span>
              <small
                className="ml-2 text-[10px] text-muted bg-primary/80 px-2 rounded-xl"
                style={{
                  backgroundColor: getColor(bot.mode),
                }}
              >
                {bot.mode}
              </small>
            </span>
          ),
          description:
            bot.description?.slice(0, 50) ||
            bot.system?.slice(0, 50) ||
            "No prompt",
          onClick: () => BotSelect.set(bot),
          actived: selectedBot?.id === id,
          onRemove: () => handleDeleteBot(id),
        }))}
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbRobot}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody
        emptyText="Please select an assistant or click the add button to create a new assistant"
        EmptyIcon={TbRobot}
        isEmpty={!selectedBot}
      >
        {selectedBot && (
          <BotEditor
            bot={selectedBot}
            setBot={(bot) => {
              if (bot) {
                BotSelect.set(bot);
              } else {
                BotSelect.set(null);
              }
            }}
          />
        )}
      </PreferenceBody>
    </PreferenceLayout>
  );
}
