/**
 * HTTP 流处理工具类
 * 用于处理 Server-Sent Events (SSE) 和流式响应
 */
export class HttpStreamHandler {
  private controller: AbortController | null = null;

  /**
   * 发起流式HTTP请求
   * @param url API URL
   * @param options 请求选项
   * @param onChunk 数据块处理回调
   * @param onError 错误处理回调
   * @returns Promise<void>
   */
  async streamRequest(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    },
    onChunk: (chunk: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    // 创建新的 AbortController
    this.controller = new AbortController();

    try {
      const response = await fetch(url, {
        method: options.method || 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        body: options.body,
        signal: this.controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('响应体不可读');
      }

      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine) {
              // 处理 SSE 格式的数据
              if (trimmedLine.startsWith('data: ')) {
                const data = trimmedLine.substring(6);
                if (data !== '[DONE]') {
                  onChunk(data);
                }
              } else if (trimmedLine.startsWith('{') || trimmedLine.startsWith('[')) {
                // 处理直接的 JSON 数据
                onChunk(trimmedLine);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // 请求被取消，正常情况
        return;
      }
      
      if (onError) {
        onError(error instanceof Error ? error : new Error(String(error)));
      } else {
        throw error;
      }
    }
  }

  /**
   * 停止当前的流式请求
   */
  abort(): void {
    if (this.controller) {
      this.controller.abort();
      this.controller = null;
    }
  }

  /**
   * 发起非流式HTTP请求
   * @param url API URL
   * @param options 请求选项
   * @returns Promise<any>
   */
  async request(
    url: string,
    options: {
      method?: string;
      headers?: Record<string, string>;
      body?: string;
    }
  ): Promise<any> {
    const response = await fetch(url, {
      method: options.method || 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: options.body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  }
} 