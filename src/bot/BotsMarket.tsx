import { BotMarketProps } from "@/common/types/bot";
import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { TbLoader2, TbTrash } from "react-icons/tb";
import { BotManager } from "./BotManger";
import { UserMananger } from "@/settings/User";

export const BotsMarket = () => {
  const [bots, setBots] = useState<BotMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const user = UserMananger.use();

  // 从 Supabase 获取机器人列表
  const fetchBots = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bots")
        .select("*")
        .order("inserted_at", { ascending: false });

      if (error) {
        throw error;
      }

      setBots(data || []);
    } catch (error) {
      console.error("Get bot list failed:", error);
      cmd.message("Get bot list failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // 安装机器人
  const handleInstall = async (bot: BotMarketProps) => {
    try {
      setInstalling(bot.id);

      // 添加到机器人管理器
      BotManager.add({
        name: bot.name,
        system: bot.system,
      });

      cmd.message(`Successfully installed bot: ${bot.name}`, "success");
    } catch (error) {
      console.error("Install bot failed:", error);
      cmd.message(
        `Install bot failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setInstalling(null);
    }
  };

  // 删除机器人
  const handleDelete = async (bot: BotMarketProps) => {
    try {
      setDeleting(bot.id);
      const { error } = await supabase.from("bots").delete().eq("id", bot.id);

      if (error) {
        throw error;
      }

      setBots(bots.filter((b) => b.id !== bot.id));
      cmd.message(`Successfully deleted bot: ${bot.name}`, "success");
    } catch (error) {
      console.error("Delete bot failed:", error);
      cmd.message(
        `Delete bot failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        "error",
      );
    } finally {
      setDeleting(null);
    }
  };

  // 初始加载
  useEffect(() => {
    fetchBots();
  }, []);

  return (
    <div className="h-[80vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchBots}
            disabled={loading}
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin mr-2">
            <TbLoader2 className="w-5 h-5" />
          </div>
          <span>Loading bots...</span>
        </div>
      ) : bots.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bots.map((bot) => (
            <div key={bot.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{bot.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {bot.system?.slice(0, 100)}
                    {bot.system?.length > 100 ? "..." : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleInstall(bot)}
                    disabled={installing === bot.id}
                  >
                    {installing === bot.id ? (
                      <>
                        <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      "Install"
                    )}
                  </Button>
                  {user?.id === bot.user_id && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(bot)}
                      disabled={deleting === bot.id}
                    >
                      {deleting === bot.id ? (
                        <TbLoader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <TbTrash className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No available bots or load failed
        </div>
      )}
    </div>
  );
};
