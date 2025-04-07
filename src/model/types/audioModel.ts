/** 音频模型信息 */
export interface AudioModelInfo {
  model: string;
  api_key: string;
  api_url: string;
}

/** 音频模型请求体 */
export interface AudioModelRequestBody {
  model: string;
  input: string;
  voice?: string;
  speed?: number;
  response_format?: string;
}

/** 音频模型响应 */
export interface AudioModelResponse<T> {
  content: T;
  error?: string;
  stop: () => Promise<void>;
}

/** 音频消息原型 */
export interface AudioMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: number;
  loading?: boolean;
  error?: string;
}
