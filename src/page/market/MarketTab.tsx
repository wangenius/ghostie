import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { useState } from "react";
import { AgentsMarket } from "./AgentsMarket";
import { MCPMarket } from "./MCPMarket";
import { PluginsMarket } from "./PluginsMarket";
import { WorkflowsMarket } from "./WorkflowsMarket";
import { Button } from "@/components/ui/button";
import {
  TbMessage,
  TbScript,
  TbShape3,
  TbServer,
  TbBook2,
} from "react-icons/tb";

const tabs = [
  {
    id: "agents",
    name: "员工市场",
    icon: <TbMessage className="h-5 w-5" />,
  },
  {
    id: "plugins",
    name: "插件市场",
    icon: <TbScript className="h-5 w-5" />,
  },
  {
    id: "workflows",
    name: "工作流市场",
    icon: <TbShape3 className="h-5 w-5" />,
  },
  {
    id: "mcp",
    name: "MCP市场",
    icon: <TbServer className="h-5 w-5" />,
  },
  {
    id: "knowledge",
    name: "知识库市场",
    icon: <TbBook2 className="h-5 w-5" />,
  },
];

export const MarketTab = () => {
  const [activeTab, setActiveTab] = useState<string>("agents");
  return (
    <PreferenceLayout>
      {/* 左侧列表 */}
      <PreferenceList
        left={
          <div className="flex items-center gap-2">
            <Button>Explore Market</Button>
          </div>
        }
        right={
          <div className="flex items-center gap-2">
            <Button>add server</Button>
          </div>
        }
        items={tabs.map((tab) => {
          return {
            id: tab.id,
            title: (
              <span className="flex items-center space-x-3 font-medium transition-colors hover:text-primary">
                {tab.icon}
                <span
                  className={`${tab.id === activeTab ? "text-primary font-semibold" : "text-muted-foreground"}`}
                >
                  {tab.name}
                </span>
              </span>
            ),
            onClick: () => {
              setActiveTab(tab.id);
            },
            actived: tab.id === activeTab,
            noRemove: true,
          };
        })}
      />

      {/* 右侧编辑区域 */}
      <PreferenceBody emptyText="请选择一个助手或点击添加按钮创建新助手">
        {activeTab === "agents" && <AgentsMarket />}
        {activeTab === "plugins" && <PluginsMarket />}
        {activeTab === "workflows" && <WorkflowsMarket />}
        {activeTab === "mcp" && <MCPMarket />}
      </PreferenceBody>
    </PreferenceLayout>
  );
};
