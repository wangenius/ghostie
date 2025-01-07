import { invoke } from "@tauri-apps/api/core";
import { emit, listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AgentManager } from "../../services/AgentManager";

interface Tool {
  name: string;
  type: "function" | "command" | "agent";
  description: string;
  parameters?: {
    name: string;
    description: string;
    required?: boolean;
    type: string;
  }[];
}

interface Knowledge {
  name?: string;
  description: string;
  url?: string;
  text?: string;
  file?: string;
}

interface Timing {
  type: "once" | "minutely" | "hourly" | "daily" | "weekly" | "monthly";
  time?: string;      // HH:mm 格式
  dayOfWeek?: number; // 0-6, 用于每周
  dayOfMonth?: number; // 1-31, 用于每月
  enable: boolean;
}

interface Agent {
  name: string;
  description?: string;
  systemPrompt: string;
  temperature: number;
  timing: {
    type: "once" | "minutely" | "hourly" | "daily" | "weekly" | "monthly";
    time?: string;      // HH:mm 格式
    dayOfWeek?: number; // 0-6, 用于每周
    dayOfMonth?: number; // 1-31, 用于每月
    enable: boolean;
  };
  tools: Tool[];
  knowledge: Knowledge[];
  env: Record<string, string>;
}

const defaultAgent: Agent = {
  name: "",
  description: "",
  systemPrompt: "",
  temperature: 0.7,
  timing: {
    type: "daily",
    time: "10:00",
    enable: false
  },
  tools: [],
  knowledge: [],
  env: {}
};

const presetTypes = [
  { value: "once", label: "单次执行" },
  { value: "minutely", label: "每分钟" },
  { value: "hourly", label: "每小时" },
  { value: "daily", label: "每天" },
  { value: "weekly", label: "每周" },
  { value: "monthly", label: "每月" }
] as const;

export function AgentEdit() {
  const [agent, setAgent] = useState<Agent>(defaultAgent);
  const [originalName, setOriginalName] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"basic" | "tools" | "knowledge" | "env">("basic");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unlisten = listen<{ name: string }>("query-params", async (event) => {
      const { name } = event.payload;
      if (name) {
        setOriginalName(name);
        try {
          const agentData = await AgentManager.getAgent(name);
          if (agentData) {
            setAgent(agentData);
          }
        } catch (error) {
          console.error("加载代理数据失败:", error);
        }
      }
    });

    inputRef.current?.focus();

    return () => {
      unlisten.then(fn => fn());
    };
  }, []);



  const handleClose = async () => {
    const window = await getCurrentWindow();
    setAgent(defaultAgent);
    window.hide();
  };

  const handleSubmit = async () => {
    try {
      await invoke("update_agent", {
        oldName: originalName,
        agent
      });
      await emit("agent-updated");
      
      await handleClose();
    } catch (error) {
      console.error("更新代理失败:", error);
    }
  };

  const addTool = () => {
    setAgent({
      ...agent,
      tools: [...agent.tools, { name: "", type: "function", description: "", parameters: [] }]
    });
  };

  const removeTool = (index: number) => {
    const newTools = [...agent.tools];
    newTools.splice(index, 1);
    setAgent({ ...agent, tools: newTools });
  };

  const addKnowledge = () => {
    setAgent({
      ...agent,
      knowledge: [...agent.knowledge, { description: "" }]
    });
  };

  const removeKnowledge = (index: number) => {
    const newKnowledge = [...agent.knowledge];
    newKnowledge.splice(index, 1);
    setAgent({ ...agent, knowledge: newKnowledge });
  };

  const addEnvVar = () => {
    setAgent({
      ...agent,
      env: {
        ...agent.env,
        [`env_${Object.keys(agent.env).length}`]: ""
      }
    });
  };

  const removeEnvVar = (key: string) => {
    const newEnv = { ...agent.env };
    delete newEnv[key];
    setAgent({ ...agent, env: newEnv });
  };

  return (
    <div className="app-container flex flex-col h-screen bg-background">
      <div
        className="flex items-center justify-between h-12 px-4 border-b border-border"
        data-tauri-drag-region
      >
        <div className="text-sm font-medium text-foreground">编辑代理</div>
        <button
          onClick={handleClose}
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("basic")}
          className={`px-4 py-2 text-sm ${activeTab === "basic" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          基础设置
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={`px-4 py-2 text-sm ${activeTab === "tools" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          工具配置
        </button>
        <button
          onClick={() => setActiveTab("knowledge")}
          className={`px-4 py-2 text-sm ${activeTab === "knowledge" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          知识库
        </button>
        <button
          onClick={() => setActiveTab("env")}
          className={`px-4 py-2 text-sm ${activeTab === "env" ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}
        >
          环境变量
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {activeTab === "basic" && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground">代理名称</label>
              <input
                ref={inputRef}
                type="text"
                value={agent.name}
                onChange={(e) => setAgent({ ...agent, name: e.target.value })}
                className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                placeholder="请输入代理名称"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground">描述</label>
              <input
                type="text"
                value={agent.description}
                onChange={(e) => setAgent({ ...agent, description: e.target.value })}
                className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground"
                placeholder="请输入代理描述"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground">系统提示词</label>
              <textarea
                value={agent.systemPrompt}
                onChange={(e) => setAgent({ ...agent, systemPrompt: e.target.value })}
                className="w-full h-24 px-3 py-2 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none placeholder:text-muted-foreground resize-none"
                placeholder="请输入系统提示词"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs text-muted-foreground">Temperature</label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={agent.temperature}
                  onChange={(e) => setAgent({ ...agent, temperature: parseFloat(e.target.value) })}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">{agent.temperature}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">定时执行</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">启用</span>
                  <input
                    type="checkbox"
                    checked={agent.timing.enable}
                    onChange={(e) => setAgent({
                      ...agent,
                      timing: { ...agent.timing, enable: e.target.checked }
                    })}
                    className="w-4 h-4"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <select
                  value={agent.timing.type}
                  onChange={(e) => setAgent({
                    ...agent,
                    timing: {
                      ...agent.timing,
                      type: e.target.value as Timing["type"]
                    }
                  })}
                  className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                >
                  {presetTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>

                {agent.timing.type !== "minutely" && (
                  <input
                    type="time"
                    value={agent.timing.time || ""}
                    onChange={(e) => setAgent({
                      ...agent,
                      timing: {
                        ...agent.timing,
                        time: e.target.value
                      }
                    })}
                    className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                  />
                )}

                {agent.timing.type === "weekly" && (
                  <select
                    value={agent.timing.dayOfWeek || 0}
                    onChange={(e) => setAgent({
                      ...agent,
                      timing: {
                        ...agent.timing,
                        dayOfWeek: parseInt(e.target.value)
                      }
                    })}
                    className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                  >
                    <option value={0}>星期日</option>
                    <option value={1}>星期一</option>
                    <option value={2}>星期二</option>
                    <option value={3}>星期三</option>
                    <option value={4}>星期四</option>
                    <option value={5}>星期五</option>
                    <option value={6}>星期六</option>
                  </select>
                )}

                {agent.timing.type === "monthly" && (
                  <select
                    value={agent.timing.dayOfMonth || 1}
                    onChange={(e) => setAgent({
                      ...agent,
                      timing: {
                        ...agent.timing,
                        dayOfMonth: parseInt(e.target.value)
                      }
                    })}
                    className="w-full h-9 px-3 bg-secondary rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                  >
                    {Array.from({ length: 31 }, (_, i) => (
                      <option key={i + 1} value={i + 1}>
                        {i + 1}日
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "tools" && (
          <div className="space-y-4">
            {agent.tools.map((tool, index) => (
              <div key={index} className="p-4 bg-secondary rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">工具 {index + 1}</h3>
                  <button
                    onClick={() => removeTool(index)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={tool.name}
                    onChange={(e) => {
                      const newTools = [...agent.tools];
                      newTools[index].name = e.target.value;
                      setAgent({ ...agent, tools: newTools });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="工具名称"
                  />
                  <select
                    value={tool.type}
                    onChange={(e) => {
                      const newTools = [...agent.tools];
                      newTools[index].type = e.target.value as "function" | "command" | "agent";
                      setAgent({ ...agent, tools: newTools });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                  >
                    <option value="function">函数调用</option>
                    <option value="command">命令调用</option>
                    <option value="agent">Agent调用</option>
                  </select>
                  <input
                    type="text"
                    value={tool.description}
                    onChange={(e) => {
                      const newTools = [...agent.tools];
                      newTools[index].description = e.target.value;
                      setAgent({ ...agent, tools: newTools });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="工具描述"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addTool}
              className="w-full h-9 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md"
            >
              <Plus className="w-4 h-4" />
              添加工具
            </button>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div className="space-y-4">
            {agent.knowledge.map((item, index) => (
              <div key={index} className="p-4 bg-secondary rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">知识 {index + 1}</h3>
                  <button
                    onClick={() => removeKnowledge(index)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={item.name || ""}
                    onChange={(e) => {
                      const newKnowledge = [...agent.knowledge];
                      newKnowledge[index].name = e.target.value;
                      setAgent({ ...agent, knowledge: newKnowledge });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="知识名称"
                  />
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const newKnowledge = [...agent.knowledge];
                      newKnowledge[index].description = e.target.value;
                      setAgent({ ...agent, knowledge: newKnowledge });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="知识描述"
                  />
                  <input
                    type="text"
                    value={item.url || ""}
                    onChange={(e) => {
                      const newKnowledge = [...agent.knowledge];
                      newKnowledge[index].url = e.target.value;
                      setAgent({ ...agent, knowledge: newKnowledge });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="URL"
                  />
                  <textarea
                    value={item.text || ""}
                    onChange={(e) => {
                      const newKnowledge = [...agent.knowledge];
                      newKnowledge[index].text = e.target.value;
                      setAgent({ ...agent, knowledge: newKnowledge });
                    }}
                    className="w-full h-24 px-3 py-2 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none resize-none"
                    placeholder="文本内容"
                  />
                  <input
                    type="text"
                    value={item.file || ""}
                    onChange={(e) => {
                      const newKnowledge = [...agent.knowledge];
                      newKnowledge[index].file = e.target.value;
                      setAgent({ ...agent, knowledge: newKnowledge });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="文件路径"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addKnowledge}
              className="w-full h-9 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md"
            >
              <Plus className="w-4 h-4" />
              添加知识
            </button>
          </div>
        )}

        {activeTab === "env" && (
          <div className="space-y-4">
            {Object.entries(agent.env).map(([key, value]) => (
              <div key={key} className="p-4 bg-secondary rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">环境变量</h3>
                  <button
                    onClick={() => removeEnvVar(key)}
                    className="p-1 text-muted-foreground hover:text-foreground"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={key}
                    onChange={(e) => {
                      const newEnv = { ...agent.env };
                      const oldValue = newEnv[key];
                      delete newEnv[key];
                      newEnv[e.target.value] = oldValue;
                      setAgent({ ...agent, env: newEnv });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="变量名"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const newEnv = { ...agent.env };
                      newEnv[key] = e.target.value;
                      setAgent({ ...agent, env: newEnv });
                    }}
                    className="w-full h-9 px-3 bg-secondary/50 rounded-md text-sm focus:bg-secondary/80 transition-colors outline-none"
                    placeholder="变量值"
                  />
                </div>
              </div>
            ))}
            <button
              onClick={addEnvVar}
              className="w-full h-9 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-md"
            >
              <Plus className="w-4 h-4" />
              添加环境变量
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-2 px-4 py-3 border-t border-border">
        <button
          onClick={handleClose}
          className="px-3 h-8 text-xs text-muted-foreground hover:bg-secondary rounded transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!agent.name}
          className="px-3 h-8 text-xs text-primary-foreground bg-primary rounded hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          保存
        </button>
      </div>
    </div>
  );
} 