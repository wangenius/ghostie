import { PluginStore } from "@/plugin/ToolPlugin";
import { MCP_Actived } from "../mcp/MCP";
import { WorkflowsStore } from "@/workflow/Workflow";
import { KnowledgesStore } from "@/store/knowledges";

export function EmptyChatMinimal({ agent }: any) {
  const plugins = PluginStore.use();
  const actived = MCP_Actived.use();
  const workflows = WorkflowsStore.use();
  const knowledges = KnowledgesStore.use();

  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <h3 className="text-lg font-semibold mb-2 text-foreground">
        开始与 {agent?.infos.name || "AI助手"} 对话
      </h3>

      <div className="w-full max-w-md mx-auto text-left mt-2 rounded bg-background/80 p-4">
        {/* 插件工具 */}
        <div className="mb-2">
          <div className="text-xs font-bold mb-1 text-muted-foreground">
            插件工具
          </div>
          <div className="flex flex-wrap gap-2">
            {agent.infos.tools.slice(0, 3).map((tool: any, i: number) => {
              const plugin = plugins[tool.plugin];
              const toolInfo = plugin?.tools?.find(
                (t: any) => t.name === tool.tool,
              );
              if (!toolInfo) return null;
              return (
                <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">
                  {plugin?.name || tool.plugin} / {toolInfo?.name || tool.tool}
                </span>
              );
            })}
            {agent.infos.tools.length > 3 && (
              <span className="px-2 py-0.5 bg-accent rounded text-xs">
                +{agent.infos.tools.length - 3}
              </span>
            )}
          </div>
        </div>
        {/* MCP工具 */}
        <div className="mb-2">
          <div className="text-xs font-bold mb-1 text-muted-foreground">
            MCP工具
          </div>
          <div className="flex flex-wrap gap-2">
            {agent.infos.mcps.slice(0, 3).map((mcp: any, i: number) => {
              const tools = actived[mcp.server] || [];
              const toolInfo = tools.find((t: any) => t.name === mcp.tool);
              if (!toolInfo) return null;
              return (
                <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">
                  {toolInfo?.name || mcp.tool}
                </span>
              );
            })}
            {agent.infos.mcps.length > 3 && (
              <span className="px-2 py-0.5 bg-accent rounded text-xs">
                +{agent.infos.mcps.length - 3}
              </span>
            )}
          </div>
        </div>
        {/* 技能 */}
        <div className="mb-2">
          <div className="text-xs font-bold mb-1 text-muted-foreground">
            技能
          </div>
          <div className="flex flex-wrap gap-2">
            {agent.infos.skills.slice(0, 3).map((id: any, i: number) => {
              const skill = (window as any).SkillManager?.getSkills?.()[id];
              if (!skill) return null;
              return (
                <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">
                  {skill?.name || id}
                </span>
              );
            })}
            {agent.infos.skills.length > 3 && (
              <span className="px-2 py-0.5 bg-accent rounded text-xs">
                +{agent.infos.skills.length - 3}
              </span>
            )}
          </div>
        </div>
        {/* 工作流 */}
        <div className="mb-2">
          <div className="text-xs font-bold mb-1 text-muted-foreground">
            工作流
          </div>
          <div className="flex flex-wrap gap-2">
            {agent.infos.workflows.slice(0, 3).map((id: any, i: number) => {
              const wf = workflows[id];
              if (!wf) return null;
              return (
                <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">
                  {wf?.name || id}
                </span>
              );
            })}
            {agent.infos.workflows.length > 3 && (
              <span className="px-2 py-0.5 bg-accent rounded text-xs">
                +{agent.infos.workflows.length - 3}
              </span>
            )}
          </div>
        </div>
        {/* 知识库 */}
        <div className="mb-2">
          <div className="text-xs font-bold mb-1 text-muted-foreground">
            知识库
          </div>
          <div className="flex flex-wrap gap-2">
            {agent.infos.knowledges.slice(0, 3).map((id: any, i: number) => {
              const k = knowledges[id];
              if (!k) return null;
              return (
                <span key={i} className="px-2 py-0.5 bg-accent rounded text-xs">
                  {k?.name || id}
                </span>
              );
            })}
            {agent.infos.knowledges.length > 3 && (
              <span className="px-2 py-0.5 bg-accent rounded text-xs">
                +{agent.infos.knowledges.length - 3}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
