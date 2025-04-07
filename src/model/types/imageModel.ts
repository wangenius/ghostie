/** 图像生成模型信息 */
export interface ImageModelInfo {
  /** 模型名称 */
  model: string;
  /** 模型API Key */
  api_key: string;
  /** 获取图片的URL */
  get_url: string;
  /** 发送请求的URL */
  post_url: string;
}

/** 图像生成模型请求体 */
export interface ImageModelRequestBody {
  /** 模型名称 */
  model: string;
  input: {
    prompt: string;
    negative_prompt?: string;
  };
  parameters: {
    size?: string;
    n?: number;
    seed?: number;
    prompt_extend?: boolean;
    watermark?: boolean;
  };
}

/** 图像生成模型响应 */
export interface ImageModelRequestResponse {
  output: {
    task_status: string;
    task_id: string;
  };
  request_id: string;
}

export interface ImageModelRequestResponseError {
  code: string;
  message: string;
  request_id: string;
}

export interface ImageResult {
  url: string;
  base64?: string;
}

export interface ImageModelGetResponse {
  output: {
    task_id: string;
    task_status: string;
    submit_time: string;
    scheduled_time: string;
    end_time: string;
    results: ImageResult[];
    task_metrics: {
      TOTAL: number;
      SUCCEEDED: number;
      FAILED: number;
    };
  };
}

export interface ImageModelGetResultError {
  output: {
    task_id: string;
    task_status: string;
    code: string;
    message: string;
    task_metrics: {
      TOTAL: number;
      SUCCEEDED: number;
      FAILED: number;
    };
  };
}

/** 图像生成消息原型 */
export interface ImageMessage {
  role: "user" | "assistant";
  content: string;
  created_at?: number;
  loading?: boolean;
  error?: string;
  images?: string[];
}
