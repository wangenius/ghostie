# 工作流系统技术分析文档

## 目录

1. [系统概述](#系统概述)
2. [工作流管理器(WorkflowManager)](#工作流管理器)
3. [工作流实例(Workflow)](#工作流实例)
4. [节点系统](#节点系统)
5. [定时调度系统](#定时调度系统)
6. [数据流转与状态管理](#数据流转与状态管理)
7. [错误处理与重试机制](#错误处理与重试机制)

## 系统概述

### 1.1 系统架构

工作流系统采用模块化设计，主要由两个核心类组成：`WorkflowManager`（工作流管理器）和 `Workflow`（工作流实例）。系统设计遵循单一职责原则，将工作流的管理和执行逻辑分离。

#### 核心组件职责

1. **WorkflowManager**

   - 工作流生命周期管理（创建、更新、删除）
   - 工作流存储和持久化
   - 定时任务调度和管理
   - 工作流状态维护

2. **Workflow**
   - 工作流实例执行控制
   - 节点状态管理
   - 节点间数据流转
   - 执行上下文维护

### 1.2 技术栈

系统采用现代化的技术栈，主要包括：

1. **核心技术**

   - TypeScript：提供强类型支持，增强代码可维护性
   - Echo 状态管理：用于状态管理和持久化存储
   - cron-parser：处理定时任务的时间表达式

2. **存储方案**

   - IndexedDB：通过 Echo 库实现的持久化存储
   - 内存状态：运行时状态管理

3. **工具库**
   - 自定义表达式评估器
   - 定时器管理工具
   - 数据流转工具

### 1.3 系统特点

1. **可扩展性**

   - 模块化设计
   - 插件化节点系统
   - 灵活的数据流转机制

2. **可靠性**

   - 完善的错误处理机制
   - 任务重试策略
   - 状态持久化

3. **易用性**
   - 声明式的工作流定义
   - 直观的节点配置
   - 丰富的节点类型支持

### 1.4 应用场景

系统适用于以下场景：

1. **自动化工作流**

   - 数据处理流程
   - 业务流程自动化
   - 定时任务执行

2. **集成场景**

   - 多系统数据集成
   - API 编排
   - 消息处理流程

3. **业务流程**
   - 审批流程
   - 数据转换流程
   - 条件分支处理

## 工作流管理器

### 2.1 核心功能

WorkflowManager 作为工作流系统的核心管理组件，提供以下主要功能：

1. **工作流存储管理**

   ```typescript
   static store = new Echo<Record<string, WorkflowProps>>(
     {},
     {
       name: "workflows",
       storage: "indexedDB",
     }
   );
   ```

   - 使用 Echo 状态管理库实现工作流数据的持久化
   - 支持 IndexedDB 存储方案
   - 提供响应式的状态访问接口

2. **任务调度管理**
   ```typescript
   private static taskStore = new Echo<Record<string, Task>>({});
   private static MAX_RETRY_COUNT = 3;
   private static RETRY_DELAY = 1000;
   ```
   - 维护运行时任务状态
   - 实现任务重试机制
   - 管理任务执行计划

### 2.2 定时任务实现

#### 2.2.1 Cron 表达式解析

```typescript
private static calculateNextRun(cronExpression: string): Date {
  try {
    const interval = CronExpressionParser.parse(cronExpression);
    return interval.next().toDate();
  } catch (error) {
    console.error("无效的 cron 表达式:", error);
    throw error;
  }
}
```

- 使用 cron-parser 库解析 cron 表达式
- 计算下次执行时间
- 异常处理机制

#### 2.2.2 精确定时器

```typescript
private static createPreciseTimer(
  taskId: string,
  cronExpr: string,
  onTick: () => Promise<void>
): NodeJS.Timeout
```

特点：

- 支持动态调整执行时间
- 自动处理任务重试
- 维护定时器引用
- 错误恢复机制

### 2.3 工作流生命周期管理

#### 2.3.1 创建工作流

```typescript
static create(workflow: WorkflowProps) {
  const now = new Date().toISOString();
  const id = gen.id();
  const newWorkflow = {
    ...workflow,
    id,
    createdAt: now,
    updatedAt: now,
  };
  this.store.set({
    ...this.store.current,
    [id]: newWorkflow,
  });
  return newWorkflow;
}
```

- 自动生成工作流 ID
- 记录创建和更新时间
- 存储工作流数据

#### 2.3.2 更新工作流

```typescript
static async update(workflow: WorkflowProps)
```

功能：

- 验证工作流存在性
- 处理定时配置变更
- 更新工作流数据
- 维护更新时间戳

#### 2.3.3 删除工作流

```typescript
static async delete(id: string)
```

特点：

- 清理相关定时任务
- 移除存储数据
- 优雅退出处理

### 2.4 任务调度功能

#### 2.4.1 调度任务

```typescript
static async schedule(id: string, cronExpressions: string): Promise<boolean>
```

实现细节：

- 支持多个 cron 表达式
- 创建精确定时器
- 记录下次执行时间
- 异常处理机制

#### 2.4.2 取消调度

```typescript
static async unschedule(id: string): Promise<void>
```

功能：

- 清理定时器资源
- 移除任务状态
- 日志记录

### 2.5 工作流执行

#### 2.5.1 执行工作流

```typescript
static async executeWorkflow(id: string)
```

特点：

- 创建工作流实例
- 执行结果处理
- 错误处理和日志记录

#### 2.5.2 初始化任务

```typescript
static async initScheduledTasks(): Promise<void>
```

功能：

- 系统启动时初始化
- 并行处理多个任务
- 错误恢复机制

### 2.6 状态管理

1. **工作流状态**

   - 使用 Echo 实现响应式状态管理
   - 支持持久化存储
   - 提供状态访问接口

2. **任务状态**

   - 运行时状态维护
   - 重试计数管理
   - 错误状态记录

3. **定时器状态**
   - 定时器引用管理
   - 执行时间计算
   - 状态同步机制

## 工作流实例

### 3.1 基础架构

#### 3.1.1 状态管理

```typescript
private state = new Echo<{
  data: WorkflowProps;
  nodeStates: Record<string, NodeState>;
  executedNodes: Set<string>;
  isExecuting: boolean;
}>;
```

核心状态组成：

- data: 工作流配置数据
- nodeStates: 节点执行状态
- executedNodes: 已执行节点集合
- isExecuting: 执行状态标志

#### 3.1.2 节点状态定义

```typescript
interface NodeState {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string;
  startTime?: string;
  endTime?: string;
}
```

### 3.2 工作流初始化

#### 3.2.1 初始工作流模板

```typescript
const INITIAL_WORKFLOW: WorkflowProps = {
  id: "",
  name: "",
  description: "",
  createdAt: "",
  updatedAt: "",
  nodes: initialNodes,
  edges: initialEdges,
  viewport: {
    x: 0,
    y: 0,
    zoom: 1,
  },
};
```

#### 3.2.2 初始化流程

```typescript
public async init(workflowId?: string): Promise<Workflow>
```

功能：

- 加载工作流配置
- 初始化节点状态
- 建立状态管理系统

### 3.3 执行机制

#### 3.3.1 图执行引擎

```typescript
private async executeGraph(graph: {
  graph: Map<string, Set<string>>;
  inDegree: Map<string, number>;
  predecessors: Map<string, Set<string>>;
})
```

特点：

- 基于拓扑排序的执行顺序
- 支持并行节点执行
- 动态依赖关系处理
- 状态同步机制

#### 3.3.2 节点执行器

```typescript
private async executeNode(node: WorkflowNode): Promise<NodeResult>
```

功能：

- 多种节点类型支持
- 输入输出管理
- 错误处理机制
- 状态更新

### 3.4 节点类型支持

系统支持多种类型的节点：

1. **开始节点(start)**

   - 工作流入口
   - 初始数据提供

2. **聊天节点(chat)**

   - 模型选择
   - 系统提示词配置
   - 动态输入处理

3. **机器人节点(bot)**

   - 机器人实例管理
   - 提示词处理
   - 结果输出

4. **插件节点(plugin)**

   - 插件加载
   - 参数配置
   - 工具调用

5. **分支节点(branch)**

   - 条件评估
   - 分支选择
   - 路径控制

6. **过滤节点(filter)**

   - 数据过滤
   - 条件组合
   - 类型转换

7. **结束节点(end)**
   - 结果汇总
   - 输出处理

### 3.5 数据流转机制

#### 3.5.1 输入收集

```typescript
private collectNodeInputs(
  nodeId: string,
  predecessors: Map<string, Set<string>>
): Record<string, any>
```

特点：

- 前置节点输出收集
- 分支条件处理
- 跳过状态处理

#### 3.5.2 输出处理

```typescript
private updateNodeState(nodeId: string, update: Partial<NodeState>)
```

功能：

- 状态更新
- 输出保存
- 时间戳记录

### 3.6 执行控制

#### 3.6.1 执行图构建

```typescript
private buildExecutionGraph()
```

实现：

- 邻接表构建
- 入度表维护
- 前置节点表生成

#### 3.6.2 工作流执行

```typescript
public async execute(): Promise<NodeResult>
```

流程：

1. 图结构构建
2. 状态初始化
3. 节点执行
4. 结果收集

### 3.7 错误处理

1. **节点级别**

   - 执行异常捕获
   - 状态更新
   - 错误信息记录

2. **工作流级别**
   - 整体执行状态维护
   - 清理机制
   - 结果封装

### 3.8 状态重置

```typescript
async reset(id?: string)
```

功能：

- 工作流重置
- 状态清理
- 新工作流创建

## 节点系统

### 4.1 节点类型定义

```typescript
type NodeType =
  | "start"
  | "end"
  | "chat"
  | "bot"
  | "plugin"
  | "branch"
  | "filter"
  | "panel";
```

### 4.2 节点配置接口

#### 4.2.1 基础节点配置

```typescript
interface NodeConfig {
  type: NodeType;
  name: string;
  inputs: Record<string, any>;
  outputs: Record<string, any>;
}
```

#### 4.2.2 特定节点配置

1. **聊天节点配置**

```typescript
interface ChatNodeConfig extends NodeConfig {
  model: string;
  system: string;
  user: string;
}
```

2. **机器人节点配置**

```typescript
interface BotNodeConfig extends NodeConfig {
  bot: string;
  prompt: string;
}
```

3. **插件节点配置**

```typescript
interface PluginNodeConfig extends NodeConfig {
  plugin: string;
  tool: string;
  args: Record<string, any>;
}
```

4. **分支节点配置**

```typescript
interface BranchNodeConfig extends NodeConfig {
  conditions: Array<{
    id: string;
    expression: string;
    description?: string;
  }>;
}
```

5. **过滤节点配置**

```typescript
interface FilterNodeConfig extends NodeConfig {
  filter: {
    group: {
      conditions: Array<FilterCondition>;
      id: string;
      type: "AND" | "OR";
      isEnabled: boolean;
    };
  };
}
```

### 4.3 节点执行逻辑

#### 4.3.1 通用执行流程

1. **前置处理**

   - 收集输入数据
   - 验证节点配置
   - 更新执行状态

2. **执行过程**

   - 根据节点类型分发
   - 调用相应处理器
   - 处理执行结果

3. **后置处理**
   - 更新节点状态
   - 保存输出数据
   - 触发后续节点

#### 4.3.2 特定节点实现

1. **聊天节点**

```typescript
case "chat":
  const chatConfig = node.data as ChatNodeConfig;
  const parsedSystem = parseInputReferences(chatConfig.system, inputs);
  const parsedUser = parseInputReferences(chatConfig.user, inputs);
  const res = await new ChatModel(ModelManager.get(chatConfig.model))
    .system(parsedSystem)
    .stream(parsedUser);
```

2. **机器人节点**

```typescript
case "bot":
  const botConfig = node.data as BotNodeConfig;
  const bot = new Bot(BotManager.get(botConfig.bot));
  const parsedPrompt = parseInputReferences(botConfig.prompt || "", inputs);
  const botResult = await bot.chat(parsedPrompt);
```

3. **插件节点**

```typescript
case "plugin":
  const pluginConfig = node.data as PluginNodeConfig;
  const plugin = PluginManager.get(pluginConfig.plugin);
  const tool = plugin.tools.find((t) => t.name === pluginConfig.tool);
  const pluginResult = await cmd.invoke("plugin_execute", {
    id: plugin.id,
    tool: pluginConfig.tool,
    args: pluginConfig.args,
  });
```

### 4.4 数据处理机制

#### 4.4.1 输入引用解析

```typescript
const parseInputReferences = (text: string, inputs: Record<string, any>) => {
  return text.replace(
    /\{\{inputs\.([^.]+)\.([^}]+)\}\}/g,
    (match, nodeId, key) => {
      const nodeInputs = inputs[nodeId];
      if (!nodeInputs) return match;
      const value = nodeInputs[key];
      return value !== undefined ? String(value) : match;
    },
  );
};
```

#### 4.4.2 条件评估

```typescript
const evaluateCondition = (condition: any, item: any): boolean => {
  const { field, operator, value, dataType } = condition;
  let itemValue = item[field];

  // 处理嵌套字段
  if (field.includes(".")) {
    const parts = field.split(".");
    itemValue = parts.reduce(
      (obj: Record<string, any>, part: string) => obj?.[part],
      item,
    );
  }
  // ... 条件评估逻辑
};
```

### 4.5 节点状态管理

#### 4.5.1 状态类型

```typescript
type NodeStatus = "pending" | "running" | "completed" | "failed" | "skipped";
```

#### 4.5.2 状态转换

- pending -> running: 节点开始执行
- running -> completed: 执行成功
- running -> failed: 执行失败
- pending -> skipped: 条件不满足跳过

### 4.6 错误处理

1. **节点级别错误**

   - 配置验证错误
   - 执行时异常
   - 数据处理错误

2. **恢复策略**
   - 状态回滚
   - 错误日志记录
   - 可选的重试机制

### 4.7 扩展性设计

1. **新节点类型添加**

   - 实现节点配置接口
   - 注册节点处理器
   - 添加类型定义

2. **节点功能增强**
   - 配置项扩展
   - 处理逻辑定制
   - 输入输出适配

## 定时调度系统

### 5.1 核心组件

#### 5.1.1 任务存储

```typescript
private static taskStore = new Echo<Record<string, Task>>({});
```

#### 5.1.2 任务接口定义

```typescript
interface Task {
  id: string;
  schedules: string[];
  timers: NodeJS.Timeout[];
  nextRunTime?: Date;
  retryCount?: number;
  lastError?: Error;
}
```

### 5.2 Cron 表达式处理

#### 5.2.1 表达式解析

```typescript
private static calculateNextRun(cronExpression: string): Date {
  try {
    const interval = CronExpressionParser.parse(cronExpression);
    return interval.next().toDate();
  } catch (error) {
    console.error("无效的 cron 表达式:", error);
    throw error;
  }
}
```

#### 5.2.2 多表达式支持

```typescript
const schedules = cronExpressions
  .split("\n")
  .map((expr) => expr.trim())
  .filter((expr) => expr !== "");
```

### 5.3 定时器管理

#### 5.3.1 精确定时器创建

```typescript
private static createPreciseTimer(
  taskId: string,
  cronExpr: string,
  onTick: () => Promise<void>
): NodeJS.Timeout
```

特点：

1. **动态调整**

   - 计算下次执行时间
   - 动态设置超时时间
   - 自动调度下次执行

2. **错误处理**

   - 重试机制
   - 错误记录
   - 状态恢复

3. **资源管理**
   - 定时器引用维护
   - 内存管理
   - 清理机制

### 5.4 调度管理

#### 5.4.1 任务调度

```typescript
static async schedule(id: string, cronExpressions: string): Promise<boolean>
```

实现细节：

1. **前置处理**

   - 取消已存在的调度
   - 验证表达式有效性
   - 初始化任务状态

2. **调度创建**

   - 解析多个表达式
   - 创建定时器
   - 计算下次执行时间

3. **状态维护**
   - 保存任务信息
   - 更新执行计划
   - 错误处理

#### 5.4.2 任务取消

```typescript
static async unschedule(id: string): Promise<void>
```

功能：

- 清理定时器资源
- 移除任务状态
- 日志记录

### 5.5 重试机制

#### 5.5.1 重试配置

```typescript
private static MAX_RETRY_COUNT = 3;
private static RETRY_DELAY = 1000;
```

#### 5.5.2 重试策略

```typescript
if (task.retryCount <= this.MAX_RETRY_COUNT) {
  console.log(`准备第 ${task.retryCount} 次重试...`);
  setTimeout(() => onTick(), this.RETRY_DELAY * task.retryCount);
}
```

特点：

- 递增延迟
- 重试次数限制
- 错误状态维护

### 5.6 任务执行

#### 5.6.1 执行流程

1. **准备阶段**

   - 获取任务配置
   - 验证执行条件
   - 更新任务状态

2. **执行阶段**

   - 调用工作流执行器
   - 处理执行结果
   - 记录执行日志

3. **后续处理**
   - 更新执行状态
   - 调度下次执行
   - 处理异常情况

#### 5.6.2 并发控制

- 多任务并行执行
- 资源占用管理
- 执行队列控制

### 5.7 系统初始化

#### 5.7.1 启动流程

```typescript
static async initScheduledTasks(): Promise<void>
```

实现：

1. **数据加载**

   - 读取持久化数据
   - 验证工作流有效性
   - 初始化任务状态

2. **调度恢复**

   - 并行初始化任务
   - 重建执行计划
   - 启动定时器

3. **错误处理**
   - 异常恢复
   - 日志记录
   - 状态同步

### 5.8 监控和维护

1. **状态监控**

   - 执行状态跟踪
   - 性能指标收集
   - 异常监测

2. **维护操作**

   - 定时器清理
   - 状态同步
   - 资源回收

3. **日志记录**
   - 执行日志
   - 错误日志
   - 性能日志

## 数据流转与状态管理

### 6.1 状态管理架构

#### 6.1.1 Echo 状态管理

```typescript
static store = new Echo<Record<string, WorkflowProps>>(
  {},
  {
    name: "workflows",
    storage: "indexedDB",
  }
);
```

特点：

1. **响应式更新**

   - 状态变更自动触发更新
   - 组件自动重渲染
   - 性能优化

2. **持久化存储**

   - IndexedDB 存储
   - 自动数据同步
   - 离线支持

3. **类型安全**
   - TypeScript 类型定义
   - 运行时类型检查
   - 开发时类型提示

### 6.2 工作流状态

#### 6.2.1 工作流属性

```typescript
interface WorkflowProps {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  nodes: Record<string, WorkflowNode>;
  edges: Record<string, WorkflowEdge>;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}
```

#### 6.2.2 节点状态

```typescript
interface NodeState {
  inputs: Record<string, any>;
  outputs: Record<string, any>;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
  error?: string;
  startTime?: string;
  endTime?: string;
}
```

### 6.3 数据流转机制

#### 6.3.1 节点间数据传递

```typescript
private collectNodeInputs(
  nodeId: string,
  predecessors: Map<string, Set<string>>
): Record<string, any>
```

实现细节：

1. **数据收集**

   - 获取前置节点输出
   - 处理分支条件
   - 跳过无效数据

2. **数据转换**

   - 类型转换
   - 格式化处理
   - 验证数据有效性

3. **特殊处理**
   - 分支节点处理
   - 合并节点处理
   - 过滤节点处理

#### 6.3.2 数据引用解析

```typescript
const parseInputReferences = (text: string, inputs: Record<string, any>) => {
  return text.replace(
    /\{\{inputs\.([^.]+)\.([^}]+)\}\}/g,
    (match, nodeId, key) => {
      const nodeInputs = inputs[nodeId];
      if (!nodeInputs) return match;
      const value = nodeInputs[key];
      return value !== undefined ? String(value) : match;
    },
  );
};
```

### 6.4 状态更新机制

#### 6.4.1 节点状态更新

```typescript
private updateNodeState(nodeId: string, update: Partial<NodeState>)
```

更新流程：

1. **状态验证**

   - 检查状态有效性
   - 验证状态转换
   - 处理冲突状态

2. **数据更新**

   - 合并状态数据
   - 保持数据一致性
   - 触发更新事件

3. **后续处理**
   - 更新相关节点
   - 触发回调函数
   - 记录状态变更

#### 6.4.2 工作流状态同步

```typescript
private state = new Echo<{
  data: WorkflowProps;
  nodeStates: Record<string, NodeState>;
  executedNodes: Set<string>;
  isExecuting: boolean;
}>;
```

### 6.5 状态持久化

#### 6.5.1 存储策略

1. **工作流数据**

   - IndexedDB 存储
   - 自动同步
   - 版本控制

2. **运行时状态**
   - 内存存储
   - 会话恢复
   - 状态重置

#### 6.5.2 数据同步

```typescript
onChange: (state, oldState) => {
  if (state.data.id === oldState.data.id) {
    WorkflowManager.update(state.data);
  }
};
```

### 6.6 状态查询与监控

#### 6.6.1 状态查询接口

```typescript
public getExecutionState() {
  return {
    nodeStates: this.state.current.nodeStates,
    executedNodes: Array.from(this.state.current.executedNodes),
  };
}
```

#### 6.6.2 状态监听机制

- 状态变更事件
- 执行进度监控
- 错误状态通知

### 6.7 状态恢复机制

#### 6.7.1 工作流重置

```typescript
async reset(id?: string)
```

功能：

- 状态初始化
- 数据清理
- 重置执行环境

#### 6.7.2 异常恢复

1. **状态备份**

   - 关键点备份
   - 回滚机制
   - 数据一致性

2. **恢复策略**
   - 渐进式恢复
   - 状态验证
   - 数据修复

### 6.8 性能优化

1. **状态更新优化**

   - 批量更新
   - 防抖处理
   - 选择性更新

2. **数据流优化**

   - 数据缓存
   - 懒加载
   - 增量更新

3. **存储优化**
   - 数据压缩
   - 清理策略
   - 索引优化

## 错误处理与重试机制

### 7.1 错误处理架构

#### 7.1.1 错误类型分类

1. **节点执行错误**

   - 配置错误
   - 运行时异常
   - 超时错误

2. **工作流错误**

   - 依赖错误
   - 状态错误
   - 并发错误

3. **系统错误**
   - 资源耗尽
   - 网络错误
   - 存储错误

#### 7.1.2 错误状态记录

```typescript
interface NodeState {
  // ... other fields
  error?: string;
  status: "pending" | "running" | "completed" | "failed" | "skipped";
}

interface Task {
  // ... other fields
  lastError?: Error;
  retryCount?: number;
}
```

### 7.2 重试机制

#### 7.2.1 重试配置

```typescript
private static MAX_RETRY_COUNT = 3;
private static RETRY_DELAY = 1000;
```

#### 7.2.2 重试策略实现

```typescript
if (task.retryCount <= this.MAX_RETRY_COUNT) {
  console.log(`准备第 ${task.retryCount} 次重试...`);
  setTimeout(() => onTick(), this.RETRY_DELAY * task.retryCount);
}
```

特点：

1. **递增延迟**

   - 避免立即重试
   - 延迟时间递增
   - 防止资源耗尽

2. **次数限制**

   - 最大重试次数
   - 重试计数器
   - 失败后终止

3. **状态维护**
   - 记录重试次数
   - 保存错误信息
   - 更新执行状态

### 7.3 错误处理流程

#### 7.3.1 节点级错误处理

```typescript
try {
  // 执行节点逻辑
  const result = await this.executeNode(node);

  if (!result.success) {
    throw new Error(`节点 ${nodeId} 执行失败: ${result.error}`);
  }
} catch (error) {
  this.updateNodeState(nodeId, {
    status: "failed",
    error: error instanceof Error ? error.message : String(error),
    endTime: new Date().toISOString(),
  });
}
```

#### 7.3.2 工作流级错误处理

```typescript
public async execute(): Promise<NodeResult> {
  try {
    // 工作流执行逻辑
  } catch (error) {
    this.state.set((state) => ({
      ...state,
      isExecuting: false,
    }));

    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### 7.4 错误恢复机制

#### 7.4.1 状态恢复

```typescript
private initializeNodeStates(graph: {
  graph: Map<string, Set<string>>;
  inDegree: Map<string, number>;
  predecessors: Map<string, Set<string>>;
}): Record<string, NodeState>
```

#### 7.4.2 数据恢复

1. **检查点恢复**

   - 保存关键状态
   - 恢复执行现场
   - 验证数据一致性

2. **部分恢复**
   - 识别失败节点
   - 恢复可用部分
   - 跳过失败部分

### 7.5 错误通知与日志

#### 7.5.1 错误日志记录

```typescript
console.error(`执行任务[${taskId}]失败:`, error);
console.log(`准备第 ${task.retryCount} 次重试...`);
```

#### 7.5.2 错误通知机制

1. **实时通知**

   - 状态变更通知
   - 错误事件触发
   - 重试进度通知

2. **错误聚合**
   - 错误分类统计
   - 失败原因分析
   - 重试效果评估

### 7.6 容错设计

#### 7.6.1 优雅降级

1. **部分执行**

   - 跳过失败节点
   - 继续可用部分
   - 保持最大功能

2. **替代方案**
   - 备选执行路径
   - 降级处理方案
   - 临时解决方案

#### 7.6.2 防御性编程

```typescript
// 输入验证
if (!node) {
  throw new Error(`节点不存在: ${nodeId}`);
}

// 类型检查
if (!Array.isArray(inputData)) {
  throw new Error("过滤节点的输入数据必须是数组");
}

// 空值处理
const parsedPrompt = parseInputReferences(botConfig.prompt || "", inputs);
```

### 7.7 监控与分析

#### 7.7.1 错误监控

1. **错误指标**

   - 失败率统计
   - 重试成功率
   - 平均恢复时间

2. **性能监控**
   - 执行时间
   - 资源消耗
   - 并发情况

#### 7.7.2 分析工具

1. **错误分析**

   - 错误模式识别
   - 根因分析
   - 趋势分析

2. **优化建议**
   - 配置优化
   - 重试策略调整
   - 资源配置建议

### 7.8 持续改进

1. **错误预防**

   - 代码质量提升
   - 测试覆盖
   - 预防性维护

2. **流程优化**

   - 错误处理流程
   - 重试策略优化
   - 监控体系完善

3. **文档更新**
   - 错误处理指南
   - 故障排除手册
   - 最佳实践总结
