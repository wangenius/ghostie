export interface Model {
  provider: string;
  name: string;
}
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
  /* 描述 */
  description?: string;
  /* 头像 */
  avatar?: string;
  /* 系统提示 */
  system: string;
  /* 模型 */
  model?: Model;
  /* 工具 */
  tools?: string[];
  /* 知识库 */
  knowledges?: string[];
  /* 工作流 */
  workflows?: string[];
  /* 温度 */
  temperature?: number;
  /* Agent模式 */
  mode?: "ReAct" | "Execute";
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

export interface BotMarketProps {
  id: string;
  /* 助手名称 */
  name: string;
  /* 助手创建时间 */
  inserted_at: string;
  /* 助手更新时间 */
  updated_at: string;
  /* 助手作者 */
  user_id: string;
  /* 助手系统提示 */
  system: string;
  /* 助手描述 */
  description: string;
}
