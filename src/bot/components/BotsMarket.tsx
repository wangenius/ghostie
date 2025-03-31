import { BotMarketProps } from "@/common/types/bot";
import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { createClient } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { TbLoader2 } from "react-icons/tb";
import { BotManager } from "../BotManger";

// 创建 Supabase 客户端
const supabase = createClient(
  "https://iwuvrfojrkclhcxfcjzy.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml3dXZyZm9qcmtjbGhjeGZjanp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM0MTA0NDIsImV4cCI6MjA1ODk4NjQ0Mn0.L_VhFwjH1wO2KyqdUBruc1O0AH78mP-2mIkdQwTyak8",
);

export const BotsMarket = () => {
  const [bots, setBots] = useState<BotMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

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
                  <div className="text-xs text-gray-400 mt-2">
                    Author: {bot.author || "Unknown"}
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleInstall(bot)}
                  disabled={installing === bot.id}
                >
                  {installing === bot.id ? (
                    <>
                      <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                      installing...
                    </>
                  ) : (
                    "Install"
                  )}
                </Button>
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
