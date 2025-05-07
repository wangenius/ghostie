import { PreferenceBody } from "@/components/layout/PreferenceBody";
import { PreferenceLayout } from "@/components/layout/PreferenceLayout";
import { PreferenceList } from "@/components/layout/PreferenceList";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  TbBook2,
  TbGhost3,
  TbScript,
  TbServer,
  TbShape3,
} from "react-icons/tb";
import { AgentsMarketTab } from "./AgentsMarketTab";
import { MCPMarketTab } from "./MCPMarketTab";
import { ToolkitsMarketTab } from "./ToolkitMarketTab";
import { WorkflowsMarketTab } from "./WorkflowsMarketTab";
import { TabListItem } from "@/components/custom/TabListItem";

const tabs = [
  {
    id: "agents",
    name: "员工市场",
    icon: TbGhost3,
  },
  {
    id: "plugins",
    name: "插件市场",
    icon: TbScript,
  },
  {
    id: "workflows",
    name: "工作流市场",
    icon: TbShape3,
  },
  {
    id: "mcp",
    name: "MCP市场",
    icon: TbServer,
  },
  {
    id: "knowledge",
    name: "知识库市场",
    icon: TbBook2,
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
            content: <TabListItem title={tab.name} description={tab.id} />,
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
        {activeTab === "agents" && <AgentsMarketTab />}
        {activeTab === "plugins" && <ToolkitsMarketTab />}
        {activeTab === "workflows" && <WorkflowsMarketTab />}
        {activeTab === "mcp" && <MCPMarketTab />}
      </PreferenceBody>
    </PreferenceLayout>
  );
};
