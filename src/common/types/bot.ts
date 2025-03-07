/** 助手
 * @param name 名称
 * @param system 系统提示
 * @param model 模型
 * @param plugins 插件
 */
export interface BotProps {
  /* 助手id */
  id: string;
  /* 名称 */
  name: string;
  /* 系统提示 */
  system: string;
  /* 默认文字模型id */
  model: string;
  /* 工具 */
  tools: string[];
  /* 知识库 */
  knowledges?: string[];
  /* 工作流 */
  workflows?: string[];
  /* 温度 */
  temperature: number;
  /* Agent模式 */
  mode: "ReAct" | "Execute";
  /* 置顶 */
  pinned?: boolean;
  /* 使用次数 */
  usageCount?: number;
  /* 最后使用时间 */
  lastUsed?: number;
  /* 视觉模型id */
  virtual_model?: {
    id: string;
  };
  /* 音频模型id */
  audio_model?: {
    id: string;
  };
  /* TTS模型id */
  tts_model?: {
    id: string;
  };
  /* 图像模型id */
  image_model?: {
    id: string;
  };
}
