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
