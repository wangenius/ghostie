---
title: Agent Mode Development
order: 1
---

# Agent Mode Reference

> use `src/agent/engine/Engine` and `src/agent/engine/EngineManager` Implement

## ReAct

```ts
export class ReAct extends Engine {
  constructor(agent: Agent) {
    super(agent);
  }

  /* 执行 */
  async execute(input: string) {
    try {
      await this.ensureInitialized();

      let iterations = 0;
      let MAX_ITERATIONS = SettingsManager.getReactMaxIterations();
      this.model.Message.setSystem(this.agent.props.system);
      this.model.Message.push([
        {
          role: "user",
          content: input,
          created_at: Date.now(),
        },
      ]);
      while (this.memory.isRunning && iterations < MAX_ITERATIONS) {
        iterations++;

        const response = await this.model.stream();

        if (!response.tool) {
          break;
        }

        input = "";
      }

      if (iterations >= MAX_ITERATIONS) {
        this.model.Message.push([
          {
            role: "user",
            content: "已达到最大迭代次数。基于当前信息，请生成最终总结回应。",
            created_at: Date.now(),
          },
        ]);
        await this.model.stream();
      }

      return this.model.Message.list[this.model.Message.list.length - 1];
    } catch (error) {
      console.error("Chat error:", error);
      throw error;
    }
  }
}

// 注册 ReAct
EngineManager.register("react", {
  name: "ReAct",
  description: "xxxxxx",
  create: (agent: Agent) => new ReAct(agent),
});
```
