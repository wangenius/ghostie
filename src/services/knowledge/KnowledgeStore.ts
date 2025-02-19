import { Echo } from "@/utils/echo";
import { nanoid } from "nanoid";

export interface TextChunkMetadata {
  source_page: number | null;
  paragraph_number: number | null;
  created_at: number;
  updated_at: number;
}

export interface TextChunk {
  content: string;
  embedding: number[];
  metadata: TextChunkMetadata;
}

export interface KnowledgeFile {
  name: string;
  content: string;
  file_type: string;
  chunks: TextChunk[];
  created_at: number;
  updated_at: number;
}

export interface Knowledge {
  id: string;
  name: string;
  version: string;
  tags: string[];
  category: string | null;
  files: KnowledgeFile[];
  created_at: number;
  updated_at: number;
}

export interface SearchResult {
  content: string;
  similarity: number;
  document_name: string;
  document_id: string;
}

export interface SearchOptions {
  threshold: number;
  limit: number;
}

const CHUNK_SIZE = 300;
const KNOWLEDGE_VERSION = "1.0.0";

export class KnowledgeStore {
  private static store = new Echo<{
    items: Knowledge[];
    apiKey: string;
  }>(
    {
      items: [],
      apiKey: "",
    },
    {
      name: "knowledge",
      storageType: "indexedDB",
    }
  );

  static use = this.store.use.bind(this.store);

  // 设置 API Key
  static setApiKey(key: string) {
    this.store.set((prev) => ({
      ...prev,
      apiKey: key,
    }));
  }

  // 获取 API Key
  static getApiKey(): string {
    return this.store.current.apiKey;
  }

  // 文本分块
  private static splitTextIntoChunks(text: string): string[] {
    const chunks: string[] = [];
    const sentences = text
      .split(/[.。!?！？\n]/)
      .filter((s) => s.trim().length > 0);

    let currentChunk = "";
    let currentChars = 0;

    for (const sentence of sentences) {
      const sentenceChars = sentence.length;

      if (currentChars + sentenceChars > CHUNK_SIZE) {
        if (currentChunk) {
          chunks.push(currentChunk);

          // 保留最后一个完整句子作为重叠部分
          const lastSentence = currentChunk
            .split(/[.。!?！？\n]/)
            .filter((s) => s.trim())
            .pop();
          if (lastSentence) {
            currentChunk = lastSentence.trim();
            currentChars = currentChunk.length;
          } else {
            currentChunk = "";
            currentChars = 0;
          }
        }
      }

      if (sentence.trim()) {
        if (currentChunk) {
          currentChunk += " ";
          currentChars += 1;
        }
        currentChunk += sentence.trim();
        currentChars += sentenceChars;
      }
    }

    if (currentChunk) {
      chunks.push(currentChunk);
    }

    return chunks;
  }

  // 计算余弦相似度
  private static cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const normA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const normB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  // 生成文本向量
  private static async textToEmbedding(text: string): Promise<number[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) {
      throw new Error("未配置 API Key");
    }

    const response = await fetch(
      "https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-v3",
          input: [text],
          dimension: "1024",
          encoding_format: "float",
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API 调用失败: ${errorText}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  }

  // 添加知识库
  static async addKnowledge(
    files: { path: string; content: string }[],
    options?: {
      name?: string;
      category?: string;
      tags?: string[];
    }
  ): Promise<Knowledge> {
    if (!this.getApiKey()) {
      throw new Error("请先配置阿里云 API Key");
    }

    const processedFiles: KnowledgeFile[] = [];
    const now = Date.now();

    for (const file of files) {
      const chunks = this.splitTextIntoChunks(file.content);
      const processedChunks: TextChunk[] = [];

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await this.textToEmbedding(chunks[i]);
        processedChunks.push({
          content: chunks[i],
          embedding,
          metadata: {
            source_page: null,
            paragraph_number: i + 1,
            created_at: now,
            updated_at: now,
          },
        });
      }

      const fileType = file.path.split(".").pop()?.toLowerCase() || "txt";
      processedFiles.push({
        name: file.path.split("/").pop() || "未知文件",
        content: file.content,
        file_type: fileType,
        chunks: processedChunks,
        created_at: now,
        updated_at: now,
      });
    }

    const knowledge: Knowledge = {
      id: nanoid(),
      name:
        options?.name ||
        processedFiles[0]?.name ||
        `知识库_${new Date().toISOString().split("T")[0]}`,
      version: KNOWLEDGE_VERSION,
      tags: options?.tags || [],
      category: options?.category || null,
      files: processedFiles,
      created_at: now,
      updated_at: now,
    };

    this.store.set((prev) => ({
      ...prev,
      items: [...prev.items, knowledge],
    }));

    return knowledge;
  }

  // 删除知识库
  static deleteKnowledge(id: string): void {
    this.store.set((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.id !== id),
    }));
  }

  // 搜索知识库
  static async searchKnowledge(
    query: string,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    if (!this.getApiKey()) {
      throw new Error("请先配置阿里云 API Key");
    }

    const queryEmbedding = await this.textToEmbedding(query);
    const results: SearchResult[] = [];

    for (const doc of this.store.current.items) {
      for (const file of doc.files) {
        for (const chunk of file.chunks) {
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            chunk.embedding
          );
          if (similarity > options.threshold) {
            results.push({
              content: chunk.content,
              similarity,
              document_name: `${doc.name}/${file.name}`,
              document_id: doc.id,
            });
          }
        }
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, options.limit);
  }

  // 获取所有知识库
  static getKnowledgeList(): Knowledge[] {
    return this.store.current.items;
  }
}
