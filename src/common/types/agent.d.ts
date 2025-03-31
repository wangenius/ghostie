import { TaskConfig } from "./task";
import { StepConfig, StepRetryConfig } from "./task";
import { ToolFunctionInfo } from "@/model/Tool";

/* Agent配置 */
export interface AgentFlowConfig extends TaskConfig {
  /* 代理定时任务 */
  timing?: {
    /* 频率 */
    frequency: string;
    /* 时间 */
    time: string;
  };
}

/** 步骤配置
 * @description 步骤配置，继承自StepConfig，并添加了模型和工具配置
 */
export interface AgentStepConfig extends StepConfig {
  /* 最大迭代次数		 */
  maxIterations: number;
  /* 是否启用json模式 */
  json: boolean;
  /* 是否启用stream模式 */
  stream: boolean;
}

/* LLM配置 */
export interface LLMConfig {
  /* 温度 */
  temperature?: number;
  /* 工具 */
  tools?: ToolFunctionInfo[];
}

export interface FunctionCallConfig extends LLMConfig {
  /* 工具 */
  tools?: string[];
}

/* 思考记录 */
export interface ThoughtRecord {
  /* 思考内容 */
  thought: string;
  /* 行动类型 */
  action: string;
  /* 结果 */
  result?: any;
}
/* 思维链记录接口 */
export interface ThoughtChain {
  /* 思维链ID */
  id: string;
  /* 思维 */
  thought: string;
  /* 行动 */
  action: {
    tool: string;
    args: any;
    result: ActionResult;
  };
  /* 观察 */
  observation: string;
  /* 时间 */
  timestamp: string;
}

/* 任务计划接口 */
export interface TaskPlan {
  id: string;
  description: string;
  steps: TaskStep[];
  status: "pending" | "in_progress" | "completed" | "failed";
}

/* 任务步骤接口 */
export interface TaskStep {
  id: string;
  description: string;
  completed: boolean;
  result?: any;
}

/* 执行结果接口 */
export interface ActionResult {
  success: boolean;
  output: any;
  error?: Error;
  observation: string;
  duration?: number;
  needReplan?: boolean;
  replanReason?: string;
}

/* Agent 配置接口 */
export interface AgentConfig {
  /* 最大迭代次数 */
  maxIterations: number;
  /* 温度 */
  temperature?: number;
}
