import {
  KNOWLEDGE_TOOL_NAME_PREFIX,
  TOOL_NAME_SPLIT,
  WORKFLOW_TOOL_NAME_PREFIX,
} from "@/assets/const";
import {
  FunctionCallResult,
  ToolCallReply,
  ToolRequestBody,
} from "../types/chatModel";
import { Workflow, WorkflowsStore } from "@/workflow/Workflow";
import { Knowledge, KnowledgesStore } from "@/knowledge/Knowledge";
import { PluginStore, ToolPlugin } from "@/plugin/ToolPlugin";
import { AgentProps, AgentToolProps } from "@/agent/types/agent";
import { Echo } from "echo-state";
import { WORKFLOW_BODY_DATABASE } from "@/assets/const";
import { StartNodeConfig, WorkflowBody } from "@/page/workflow/types/nodes";
import { VisionModel } from "../vision/VisionModel";

export class ToolsHandler {
  static async transformAgentToolToModelFormat(
    tools: AgentToolProps[],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    for (const tool of tools) {
      const plugin = await ToolPlugin.get(tool.plugin);
      const targetTool = plugin.props.tools.find(
        (item) => item.name === tool.tool,
      );

      if (targetTool)
        toolRequestBody.push({
          type: "function",
          function: {
            name: `${targetTool.name}${TOOL_NAME_SPLIT}${plugin.props.id}`,
            description: targetTool.description,
            parameters: targetTool.parameters,
          },
        });
    }
    return toolRequestBody;
  }
  static async transformModelToModelFormat(
    models: AgentProps["models"],
  ): Promise<ToolRequestBody> {
    const toolRequestBody: ToolRequestBody = [];
    if (models?.vision) {
      toolRequestBody.push({
        type: "function",
        function: {
          name: "VISION",
          description: "使用视觉模型查看图片内容, 一次只能查看一张图片",
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

  static async call(
    tool_call: ToolCallReply,
    otherModels: AgentProps["models"],
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
        const vision = VisionModel.create(otherModels?.vision);
        console.log(vision);
        const result = await vision.execute(image, queryContent);
        return {
          name: tool_call.function.name,
          arguments: tool_call.function.arguments,
          result,
        };
      }

      const firstName = tool_call.function.name.split(TOOL_NAME_SPLIT)[0];
      const secondName = tool_call.function.name.split(TOOL_NAME_SPLIT)[1];

      if (firstName === WORKFLOW_TOOL_NAME_PREFIX) {
        const workflow = Workflow.get(secondName);
        if (!workflow) {
          return {
            name: tool_call.function.name,
            arguments: tool_call.function.arguments,
            result: "the called workflow not found",
          };
        }
        const result = await workflow.execute();
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
      return { type: "vision", name: "VISION" };
    }

    const firstName = toolName.split(TOOL_NAME_SPLIT)[0];
    const secondName = toolName.split(TOOL_NAME_SPLIT)[1];

    if (firstName === WORKFLOW_TOOL_NAME_PREFIX) {
      const list = await WorkflowsStore.getCurrent();
      return { type: "workflow", name: list[secondName].name || secondName };
    }

    if (firstName === KNOWLEDGE_TOOL_NAME_PREFIX) {
      const list = await KnowledgesStore.getCurrent();
      return {
        type: "knowledge",
        name: list[secondName].name || secondName,
      };
    }

    const plugins = await PluginStore.getCurrent();
    const plugin = plugins[secondName];
    return {
      type: plugin.name,
      name:
        plugin.tools.find((item) => item.name === firstName)?.name || firstName,
    };
  }
}
