# 装饰器 IPC 系统

这个文件夹包含了基于装饰器的 IPC 系统实现，允许在类方法上直接使用装饰器来注册 IPC 处理器。

## 核心文件

### `decorators.ts`
包含装饰器的核心实现：
- `@IpcHandle(channel)` - 装饰器，用于标记 IPC 处理器方法
- `registerIpcHandlers(instance)` - 注册实例的所有 IPC 处理器
- `unregisterIpcHandlers(instance)` - 取消注册实例的 IPC 处理器

## 使用方法

### 1. 在类中使用装饰器

```typescript
import { IpcHandle } from "../ipc/decorators";

class MyService {
    @IpcHandle("my-service-method")
    async myMethod(param1: string, param2: number): Promise<string> {
        // 处理逻辑
        return `处理结果: ${param1} - ${param2}`;
    }

    @IpcHandle("my-service-list")
    async getList(): Promise<any[]> {
        // 返回列表
        return [];
    }
}
```

### 2. 注册 IPC 处理器

```typescript
import { registerIpcHandlers } from "../ipc/decorators";

// 在构造函数中自动注册
class MyService {
    constructor() {
        // 自动注册当前实例的所有 IPC 处理器
        registerIpcHandlers(this);
    }
}

// 或者手动注册
const service = new MyService();
registerIpcHandlers(service);
```

### 3. 清理 IPC 处理器

```typescript
import { unregisterIpcHandlers } from "../ipc/decorators";

class MyService {
    close() {
        // 清理时取消注册
        unregisterIpcHandlers(this);
    }
}
```

## Agent 类示例

Agent 类是这个系统的完整实现示例：

```typescript
export class Agent {
    private constructor(infos: AgentInfos) {
        this.infos = infos;
        this.context = Context.create(this);
        this.engine = Engine.create(this);
        
        // 自动注册 IPC 处理器
        registerIpcHandlers(this);
    }

    @IpcHandle("agent-list")
    async getAgentList(): Promise<Record<string, AgentInfos>> {
        return await AgentManager.getList();
    }

    @IpcHandle("agent-create")
    async createAgent(infos?: Partial<AgentInfos>): Promise<AgentInfos> {
        const agent = await AgentManager.create(infos);
        return agent.infos;
    }

    close() {
        this.engine.close();
        // 取消注册 IPC 处理器
        unregisterIpcHandlers(this);
    }
}
```

## 前端调用

### 使用 electron-adapter

```typescript
import { agent } from '@/utils/electron-adapter';

// 调用 Agent API
const agentList = await agent.getList();
const newAgent = await agent.create({ name: 'Test Agent' });
```

### 使用 cmd.invoke

```typescript
import { cmd } from '@/utils/shell';

// 直接调用 IPC 通道
const agentList = await cmd.invoke('agent-list');
const newAgent = await cmd.invoke('agent-create', { name: 'Test Agent' });
```

## 优势

1. **简洁性** - 使用装饰器直接在方法上标记 IPC 处理器
2. **自动化** - 自动注册和取消注册，减少手动管理
3. **类型安全** - 保持 TypeScript 的类型检查
4. **可维护性** - 业务逻辑和 IPC 处理器在同一个类中
5. **灵活性** - 支持多个实例，每个实例可以独立管理

## 注意事项

1. 确保在 `tsconfig.node.json` 中启用了装饰器支持：
   ```json
   {
     "compilerOptions": {
       "experimentalDecorators": true,
       "emitDecoratorMetadata": true
     }
   }
   ```

2. 在 `channels.ts` 中定义新的 IPC 通道类型

3. 避免重复注册同一个实例的处理器

4. 在实例销毁时记得取消注册处理器

## 扩展

可以基于这个系统创建更多的装饰器，例如：
- `@IpcSend` - 用于发送消息
- `@IpcListen` - 用于监听事件
- `@IpcValidate` - 用于参数验证

这个系统为 Electron 应用提供了一个强大而灵活的 IPC 管理解决方案。 