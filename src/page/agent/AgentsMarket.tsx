import { AgentMarketProps } from "@/agent/types/agent";
import { Button } from "@/components/ui/button";
import { cmd } from "@/utils/shell";
import { supabase } from "@/utils/supabase";
import { useEffect, useState } from "react";
import { TbLoader2, TbTrash } from "react-icons/tb";
import { UserMananger } from "@/settings/User";
import { Agent } from "../../agent/Agent";
import { toast } from "sonner";

export const AgentsMarket = () => {
  const [agents, setAgents] = useState<AgentMarketProps[]>([]);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const user = UserMananger.use();

  // 从 Supabase 获取机器人列表
  const fetchAgents = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("agents")
        .select("*")
        .order("inserted_at", { ascending: false });

      if (error) {
        throw error;
      }

      setAgents(data || []);
    } catch (error) {
      console.error("Get agent list failed:", error);
      cmd.message("Get agent list failed", "error");
    } finally {
      setLoading(false);
    }
  };

  // 安装机器人
  const handleInstall = async (agent: AgentMarketProps) => {
    try {
      setInstalling(agent.id);

      // 添加到机器人管理器
      Agent.create({
        name: agent.name,
        system: agent.system,
      });
      toast.success(`Successfully installed agent: ${agent.name}`);
    } catch (error) {
      console.error("Install agent failed:", error);
      toast.error(`Install agent failed: ${error}`);
    } finally {
      setInstalling(null);
    }
  };

  // 删除机器人
  const handleDelete = async (agent: AgentMarketProps) => {
    try {
      setDeleting(agent.id);
      const { error } = await supabase
        .from("agents")
        .delete()
        .eq("id", agent.id);

      if (error) {
        throw error;
      }

      setAgents(agents.filter((b) => b.id !== agent.id));
      cmd.message(`Successfully deleted agent: ${agent.name}`, "success");
    } catch (error) {
      console.error("Delete agent failed:", error);
      cmd.message(
        `Delete agent failed: ${
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
    fetchAgents();
  }, []);

  return (
    <div className="h-[80vh]">
      <div className="flex items-center justify-between mb-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAgents}
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
          <span>Loading agents...</span>
        </div>
      ) : agents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => (
            <div key={agent.id} className="border rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">{agent.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {agent.system?.slice(0, 100)}
                    {agent.system?.length > 100 ? "..." : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleInstall(agent)}
                    disabled={installing === agent.id}
                  >
                    {installing === agent.id ? (
                      <>
                        <TbLoader2 className="w-4 h-4 mr-1 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      "Install"
                    )}
                  </Button>
                  {user?.id === agent.user_id && (
                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => handleDelete(agent)}
                      disabled={deleting === agent.id}
                    >
                      {deleting === agent.id ? (
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
          No available agents or load failed
        </div>
      )}
    </div>
  );
};
