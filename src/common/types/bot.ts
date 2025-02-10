import { ModelName } from "./model";

/** 助手
 * @param name 名称
 * @param system 系统提示
 * @param model 模型
 * @param tools 工具
 */
export interface BotProps {
  /* 名称 */
  name: string;
  /* 系统提示 */
  system: string;
  /* 模型 */
  model: ModelName;
  /* 工具 */
  tools: string[];
}
