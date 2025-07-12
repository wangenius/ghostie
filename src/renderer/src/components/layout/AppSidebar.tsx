import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { AgentInfos } from '@common/types/agent';
import { SidebarContainer, SidebarItem } from '@/components/ui/sidebar';
import { AgentList } from '@/components/agent/AgentList';
import { AgentEditDialog } from '@/components/agent/AgentEditDialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TbMessageCircle, TbRobot, TbSettings, TbPlus } from 'react-icons/tb';

interface AppSidebarProps {
  activeTab: 'chat' | 'agents' | 'settings';
  setActiveTab: (tab: 'chat' | 'agents' | 'settings') => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  agentHooks: {
    agents: AgentInfos[];
    currentAgent: AgentInfos | null;
    isLoading: boolean;
    error: string | null;
    createAgent: (data: Partial<AgentInfos>) => Promise<AgentInfos>;
    updateAgent: (id: string, data: Partial<Omit<AgentInfos, 'id'>>) => Promise<void>;
    deleteAgent: (id: string) => Promise<void>;
    selectAgent: (agent: AgentInfos | null) => void;
  };
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  agentHooks,
}) => {
  
  const [editingAgent, setEditingAgent] = useState<AgentInfos | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // 处理 Agent 保存
  const handleAgentSave = async (agent: AgentInfos) => {
    try {
      if (editingAgent) {
        await agentHooks.updateAgent(agent.id, agent);
      } else {
        await agentHooks.createAgent(agent);
      }
      setEditingAgent(null);
      setShowCreateDialog(false);
    } catch (error) {
      console.error('保存 Agent 失败:', error);
    }
  };

  // 处理创建 Agent
  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowCreateDialog(true);
  };

  // 处理编辑 Agent
  const handleEditAgent = (agent: AgentInfos) => {
    setEditingAgent(agent);
    setShowCreateDialog(true);
  };

  return (
    <>
      <SidebarContainer
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        className="border-r bg-background"
      >
        {/* 导航栏 */}
        <div className="flex-none p-3 border-b">
          <div className="space-y-1">
            <SidebarItem
              icon={TbMessageCircle}
              active={activeTab === 'chat'}
              collapsed={collapsed}
              onClick={() => setActiveTab('chat')}
            >
              聊天
            </SidebarItem>
            
            <SidebarItem
              icon={TbRobot}
              active={activeTab === 'agents'}
              collapsed={collapsed}
              onClick={() => setActiveTab('agents')}
            >
              助手
            </SidebarItem>
            
            <SidebarItem
              icon={TbSettings}
              active={activeTab === 'settings'}
              collapsed={collapsed}
              onClick={() => setActiveTab('settings')}
            >
              设置
            </SidebarItem>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'chat' && (
            <div className="h-full p-3">
              <div className="text-sm text-muted-foreground">
                {collapsed ? '💬' : '聊天历史'}
              </div>
              {/* 这里后续可以添加聊天历史列表 */}
            </div>
          )}
          
          {activeTab === 'agents' && (
            <AgentList
              agents={agentHooks.agents}
              currentAgent={agentHooks.currentAgent}
              isLoading={agentHooks.isLoading}
              onCreateAgent={handleCreateAgent}
              onEditAgent={handleEditAgent}
              onSelectAgent={agentHooks.selectAgent}
              onDeleteAgent={agentHooks.deleteAgent}
            />
          )}
          
          {activeTab === 'settings' && (
            <div className="h-full p-3">
              <div className="text-sm text-muted-foreground">
                {collapsed ? '⚙️' : '应用设置'}
              </div>
              {/* 这里后续可以添加设置面板 */}
            </div>
          )}
        </div>

        {/* 底部操作区 */}
        {!collapsed && (
          <div className="flex-none p-3 border-t">
            <div className="text-xs text-muted-foreground text-center">
              Ghostie v1.0.0
            </div>
          </div>
        )}
      </SidebarContainer>

      {/* Agent 编辑对话框 */}
      <AgentEditDialog
        agent={editingAgent}
        open={showCreateDialog}
        onClose={() => {
          setShowCreateDialog(false);
          setEditingAgent(null);
        }}
        onSave={handleAgentSave}
      />
    </>
  );
}; 