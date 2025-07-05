export interface EmbeddingModelRequestBody {
  model: string;
  input: string[];
  dimension: string;
  encoding_format: string;
}

export interface EmbeddingModelResponse {
  data: {
    embedding: number[];
  }[];
}

export class EmbeddingModel {
  /** 模型 */
  protected model: string;
  /** API密钥 */
  protected api_key: string;
  /** API URL */
  protected api_url: string;

  /** 构造函数
   * @param config 模型配置
   */
  constructor(config: { api_key: string; api_url: string; model: string }) {
    this.api_key = config.api_key;
    this.api_url = config.api_url;
    this.model = config.model;
  }

  getApiUrl() {
    return this.api_url;
  }

  public setApiKey(apiKey: string): this {
    this.api_key = apiKey;
    return this;
  }

  public setApiUrl(apiUrl: string): this {
    this.api_url = apiUrl;
    return this;
  }

  /**
   * 准备请求体，允许子类重写以添加特定参数
   * @param body 基础请求体
   * @returns 处理后的请求体
   */
  protected prepareRequestBody(
    body: EmbeddingModelRequestBody,
  ): EmbeddingModelRequestBody {
    // 默认实现直接返回原始请求体
    return body;
  }

  protected parseResponseBody(payload: EmbeddingModelResponse): number[] {
    return payload.data[0].embedding;
  }

  async textToEmbedding(text: string): Promise<number[]> {
    const response = await fetch(this.api_url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.api_key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        input: [text],
        dimension: "1024",
        encoding_format: "float",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${errorText}`);
    }

    const data = await response.json();
    return this.parseResponseBody(data);
  }
}
