import { Agent } from "@/agent/Agent";
import { AgentInfos, AgentMCPProps, AgentToolProps } from "@/agent/types/agent";
import {
  AGENT_TOOL_NAME_PREFIX,
  KNOWLEDGE_TOOL_NAME_PREFIX,
  SKILL_TOOL_NAME_PREFIX,
  TOOL_NAME_SPLIT,
  WORKFLOW_BODY_DATABASE,
  WORKFLOW_TOOL_NAME_PREFIX,
} from "@/assets/const";
import { Knowledge } from "@/knowledge/Knowledge";
import { MCP, MCP_Actived } from "@/page/mcp/MCP";
import { StartNodeConfig, WorkflowBody } from "@/page/workflow/types/nodes";
import { PluginStore, ToolPlugin } from "@/plugin/ToolPlugin";
import { ToolParameters } from "@/plugin/types";
import { ImageManager } from "@/resources/Image";
import { SkillManager } from "@/skills/SkillManager";
import { KnowledgesStore } from "@/store/knowledges";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { Echo } from "echo-state";
import { ImageModel } from "../image/ImageModel";
import {
  FunctionCallResult,
  ToolCallReply,
  ToolRequestBody,
} from "../types/chatModel";
import { VisionModel } from "../vision/VisionModel";
import { AgentManager } from "@/store/AgentManager";

export class ToolsHandler {
  static async transformAgentToolToModelFormat(
    tools: AgentToolProps[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    const list = await PluginStore.getCurrent();
    for (const tool of tools) {
      /* 获取插件 */
      /* 如果插件不存在 */
      if (!list[tool.plugin]) continue;
      const plugin = list[tool.plugin];
      const targetTool = plugin.tools.find((item) => item.name === tool.tool);
      if (targetTool)
        toolRequestBody.push({
          type: "function",
          function: {
            name: `${targetTool.name}${TOOL_NAME_SPLIT}${list[tool.plugin].id}`,
            description: targetTool.description,
            parameters: targetTool.parameters,
          },
        });
    }
    return toolRequestBody;
  }
  static async transformMCPToModelFormat(
    mcps: AgentMCPProps[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    for (const mcp of mcps) {
      const tools = MCP_Actived.current[mcp.server];
      const targetTool = tools?.find((item) => item.name === mcp.tool);

      if (targetTool)
        toolRequestBody.push({
          type: "function",
          function: {
            name: `${targetTool.name}${TOOL_NAME_SPLIT}mcp`,
            description: targetTool.description,
            parameters: targetTool.inputSchema as ToolParameters,
          },
        });
    }
    return toolRequestBody;
  }

  static async transformModelToModelFormat(
    models: AgentInfos["models"],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    if (models?.vision) {
      toolRequestBody.push({
        type: "function",
        function: {
          name: "VISION",
          description:
            "当你需要查看图片内容时, 使用此工具，一次只能查看一张图片",
          parameters: {
            type: "object",
            properties: {
              image: {
                type: "string",
                description: "图片的ID",
              },
              query: {
                type: "string",
                description: "查询内容",
              },
            },
            required: ["image", "query"],
          },
        },
      });
    }
    if (models?.image) {
      toolRequestBody.push({
        type: "function",
        function: {
          name: "IMAGE",
          description: "当你需要生成图片时, 使用此工具",
          parameters: {
            type: "object",
            properties: {
              prompt: {
                type: "string",
                description: "AI文生图的正向提示词",
              },
              negative_prompt: {
                type: "string",
                description: "AI文生图的负面提示词",
              },
            },
            required: ["prompt"],
          },
        },
      });
    }

    return toolRequestBody;
  }

  static async transformWorkflowToModelFormat(
    workflows: string[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    if (workflows.length) {
      /* 获取工作流 */
      const flows = await WorkflowsStore.getCurrent();
      console.log(flows);

      await Promise.all(
        workflows.map(async (workflow) => {
          console.log(workflow);
          const flow = flows[workflow];
          if (!flow) return;

          const instance = Echo.get<WorkflowBody>({
            database: WORKFLOW_BODY_DATABASE,
            name: workflow,
          });

          const body = await instance.getCurrent();

          const startNode = Object.values(body?.nodes || {}).find(
            (node) => node.type === "start",
          );

          console.log(startNode);
          if (!startNode) return;
          /* 将工作流变成工具 */
          toolRequestBody.push({
            type: "function",
            function: {
              name: `${WORKFLOW_TOOL_NAME_PREFIX}${TOOL_NAME_SPLIT}${flow.id}`,
              description: flow.description,
              parameters:
                (startNode.data as StartNodeConfig).parameters || null,
            },
          });
        }),
      );
    }
    console.log(toolRequestBody);
    return toolRequestBody;
  }

  static async transformKnowledgeToModelFormat(
    knowledges: string[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    if (knowledges.length) {
      /* 获取知识库 */
      const list = await KnowledgesStore.getCurrent();

      /* 将知识库变成工具 */
      knowledges.forEach((knowledge) => {
        const knowledgeDoc = list[knowledge];
        if (!knowledgeDoc) return;
        toolRequestBody.push({
          type: "function",
          function: {
            name: `${KNOWLEDGE_TOOL_NAME_PREFIX}${TOOL_NAME_SPLIT}${knowledge}`,
            description: `${knowledgeDoc.description}`,
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "查询字段或内容",
                },
              },
              required: ["query"],
            },
          },
        });
      });
    }
    return toolRequestBody;
  }
  static async transformAgentToModelFormat(
    agents: string[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    if (agents.length) {
      /* 获取代理 */
      const list = await AgentManager.list.getCurrent();

      /* 将知识库变成工具 */
      agents.forEach((agent) => {
        const agentDoc = list[agent];
        if (!agentDoc) return;
        toolRequestBody.push({
          type: "function",
          function: {
            name: `${AGENT_TOOL_NAME_PREFIX}${TOOL_NAME_SPLIT}${agent}`,
            description: `${agentDoc.description}`,
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "调用该Agent的用户提示词",
                },
              },
              required: ["query"],
            },
          },
        });
      });
    }
    return toolRequestBody;
  }

  static async transformSkillToModelFormat(
    skills: string[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    if (skills.length) {
      /* 获取代理 */
      const list = SkillManager.getSkills();

      /* 将知识库变成工具 */
      skills.forEach((skill) => {
        const skillDoc = list[skill];
        if (!skillDoc) return;
        toolRequestBody.push({
          type: "function",
          function: {
            name: `${SKILL_TOOL_NAME_PREFIX}${TOOL_NAME_SPLIT}${skill}`,
            description: skillDoc.description,
            parameters: skillDoc.params,
          },
        });
      });
    }
    return toolRequestBody;
  }

  static async call(
    tool_call: ToolCallReply,
    agent: Agent,
  ): Promise<FunctionCallResult | undefined> {
    if (!tool_call) return;

    try {
      let query;
      try {
        query = JSON.parse(tool_call.function.arguments);
      } catch {
        throw new Error("tool call arguments error");
      }

      if (tool_call.function.name === "VISION") {
        const { image, query: queryContent } = query as {
          image: string;
          query: string;
        };
        console.log(image, queryContent);
        const vision = VisionModel.create(agent.infos.models?.vision);
        const result = await vision.execute(image, queryContent);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result,
        };
      }

      if (tool_call.function.name === "IMAGE") {
        const { prompt, negative_prompt } = query as {
          prompt: string;
          negative_prompt: string;
        };
        const image = ImageModel.create(agent.infos.models?.image);
        console.log(image);
        const result = await image.generate(prompt, negative_prompt);
        console.log(result);

        if ("output" in result) {
          const task_id = result.output.task_id;
          await ImageManager.setImage(task_id, "", "image/png");
          await ImageManager.setImageTaskId(task_id, task_id);

          // 轮询检查图片生成状态
          let generateResult;
          while (true) {
            generateResult = await image.getResult();
            if (
              generateResult.output.task_status === "SUCCEEDED" &&
              "results" in generateResult.output &&
              generateResult.output.results[0]?.base64
            ) {
              const base64Image = generateResult.output.results[0].base64;
              await ImageManager.setImage(task_id, base64Image, "image/png");
              break;
            } else if (generateResult.output.task_status === "FAILED") {
              break;
            }
            // 等待3秒后再次检查
            await new Promise((resolve) => setTimeout(resolve, 3000));
          }
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: task_id,
          };
        } else {
          throw result.message;
        }
      }

      const firstName = tool_call.function.name.split(TOOL_NAME_SPLIT)[0];
      const secondName = tool_call.function.name.split(TOOL_NAME_SPLIT)[1];

      if (secondName === "mcp") {
        const server = Object.keys(MCP_Actived.current).find((item) => {
          return MCP_Actived.current[item].find(
            (tool) => tool.name === firstName,
          );
        });
        if (!server) {
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: "the called mcp not found",
          };
        }
        const result = await (await MCP.get(server)).run(firstName, query);
        console.log("result", result);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result,
        };
      }
      if (firstName === WORKFLOW_TOOL_NAME_PREFIX) {
        const workflow = await Workflow.get(secondName);
        if (!workflow) {
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: "the called workflow not found",
          };
        }
        const result = await workflow.execute(query);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result,
        };
      }
      if (firstName === AGENT_TOOL_NAME_PREFIX) {
        const agent = await AgentManager.getFromLocal(secondName);

        if (!agent) {
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: "the called agent not found",
          };
        }
        const result = await agent.chat(query.query);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result,
        };
      }
      if (firstName === SKILL_TOOL_NAME_PREFIX) {
        const result = await SkillManager.execute(secondName, query, agent);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result,
        };
      }
      if (firstName === KNOWLEDGE_TOOL_NAME_PREFIX) {
        if (!query.query) {
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: "the query content can't be empty",
          };
        }
        /* 搜索知识库 */
        const knowledgeDoc = await Knowledge.search(query.query, [secondName]);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result: knowledgeDoc,
        };
      }

      const plugin = await ToolPlugin.get(secondName);
      /** 执行工具  */
      const toolResult = await plugin.execute(firstName, query);
      /* 返回工具调用结果 */
      return {
        name: tool_call.function.name,
        arguments: query,
        result: toolResult,
      };
    } catch (error) {
      return {
        name: tool_call.function.name,
        arguments: tool_call.function.arguments,
        result: { error },
      };
    }
  }

  static async ToolNameParser(toolName: string) {
    if (toolName === "VISION") {
      return { type: "vision", name: "checking image" };
    }
    if (toolName === "IMAGE") {
      return { type: "image", name: "generating image" };
    }

    if (toolName.includes("mcp")) {
      const firstName = toolName.split(TOOL_NAME_SPLIT)[0];
      return { type: "mcp", name: `running mcp: ${firstName}` };
    }

    const firstName = toolName.split(TOOL_NAME_SPLIT)[0];
    const secondName = toolName.split(TOOL_NAME_SPLIT)[1];

    if (firstName === AGENT_TOOL_NAME_PREFIX) {
      const list = await AgentManager.list.getCurrent();
      return {
        type: "agent",
        name: `calling agent: ${list[secondName].name}`,
      };
    }
    if (firstName === SKILL_TOOL_NAME_PREFIX) {
      const list = SkillManager.getSkills();
      return {
        type: "skill",
        name: `calling skill: ${list[secondName].name}`,
      };
    }

    if (firstName === WORKFLOW_TOOL_NAME_PREFIX) {
      const list = await WorkflowsStore.getCurrent();
      return {
        type: "workflow",
        name: `running workflow: ${list[secondName].name}`,
      };
    }

    if (firstName === KNOWLEDGE_TOOL_NAME_PREFIX) {
      const list = await KnowledgesStore.getCurrent();
      return {
        type: "knowledge",
        name: `searching knowledge: ${list[secondName].name}`,
      };
    }

    const plugins = await PluginStore.getCurrent();
    const plugin = plugins[secondName];
    return {
      type: plugin?.name,
      name: `calling tool: ${plugin?.tools.find((item) => item.name === firstName)?.name || firstName}`,
    };
  }
}
