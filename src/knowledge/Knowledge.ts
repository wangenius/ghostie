import { FileMetadata } from "@/page/knowledge/KnowledgeCreator";
import { EmbeddingModelManager } from "@/model/embedding/EmbeddingModelManger";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { splitTextIntoChunks } from "@/utils/text";
import { Echo } from "echo-state";
import { SettingsManager } from "../settings/SettingsManager";

/* 文本块元数据 */
export interface TextChunkMetadata {
  /* 来源页面 */
  source_page: number | null;
  /* 段落编号 */
  paragraph_number: number | null;
  /* 创建时间 */
  created_at: number;
  /* 更新时间 */
  updated_at: number;
}

/* 文本块 */
export interface TextChunk {
  /* 文本内容 */
  content: string;
  /* 文本向量 */
  embedding: number[];
  /* 文本元数据 */
  metadata: TextChunkMetadata;
}

/* 知识库文件 */
export interface KnowledgeFile {
  /* 文件名称 */
  name: string;
  /* 文件内容 */
  content: string;
  /* 文件类型 */
  file_type: string;
  /* 文本块 */
  chunks: TextChunk[];
  /* 创建时间 */
  created_at: number;
  /* 更新时间 */
  updated_at: number;
}

/* 知识库 */
export interface KnowledgeProps {
  meta: KnowledgeMeta;
  /* 知识库文件 */
  files: KnowledgeFile[];
}

export interface KnowledgeMeta {
  /* 知识库ID */
  id: string;
  /* 知识库名称 */
  name: string;
  /* 知识库描述, 用于机器人function call */
  description: string;
  /* 知识库版本 */
  version: string;
  /* 知识库文件 */
  /* 创建时间 */
  created_at: number;
  /* 更新时间 */
  updated_at: number;
}

/* 搜索结果 */
export interface SearchResult {
  /* 文本内容 */
  content: string;
  /* 相似度 */
  similarity: number;
  /* 文档名称 */
  document_name: string;
  /* 文档ID */
  document_id: string;
}

/* 搜索选项 */
export interface SearchOptions {
  /* 相似度阈值 */
  threshold: number;
  /* 结果数量 */
  limit: number;
}

/* 进度回调接口 */
export interface ProgressCallback {
  /* 当前进度（0-100） */
  progress: number;
  /* 当前状态描述 */
  status: string;
  /* 当前处理的文件名 */
  currentFile?: string;
}

const CHUNK_SIZE = 425;
const KNOWLEDGE_VERSION = "1.0.0";

export class Knowledge {
  store = new Echo<KnowledgeProps | null>(null);
  private static list = new Echo<{
    knowledge: string;
    list: Record<string, KnowledgeMeta>;
  }>({
    knowledge: "",
    list: {},
  }).localStorage({
    name: "knowledge_list",
  });
  static useList = this.list.use.bind(this.list);
  static database = "knowledge";
  use = this.store.use.bind(this.store);

  constructor(id: string) {
    this.store = new Echo<KnowledgeProps | null>(null).indexed({
      database: Knowledge.database,
      name: id,
    });
  }

  async docs() {
    return this.store.getCurrent();
  }

  static getList() {
    return Knowledge.list.current.list;
  }

  switch(id: string) {
    this.store.switch(id);
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

  async setDescription(description: string) {
    this.store.set((prev) => ({
      ...prev,
      description,
    }));

    const id = (await this.store.getCurrent())?.meta.id;
    if (!id) {
      return;
    }

    Knowledge.list.set((prev) => {
      return {
        ...prev,
        list: {
          ...prev.list,
          [id]: {
            ...prev.list[id],
            description,
          },
        },
      };
    });
  }

  async setName(name: string) {
    const id = (await this.store.getCurrent())?.meta.id;
    if (!id) {
      return;
    }
    this.store.set((prev) => {
      if (!prev) {
        return prev;
      }
      return {
        ...prev,
        meta: {
          ...prev.meta,
          name,
        },
      };
    });
    Knowledge.list.set((prev) => {
      return {
        ...prev,
        list: {
          ...prev.list,
          [id]: {
            ...prev.list[id],
            name,
          },
        },
      };
    });
  }

  /** 添加知识库
   * @param filePaths 文件路径
   * @param options 选项
   * @returns 知识库
   */
  static async add(
    filePaths: FileMetadata[],
    options?: {
      name?: string;
      description?: string;
      onProgress?: (progress: ProgressCallback) => void;
    },
  ) {
    const model = SettingsManager.current.knowledge.baseModel;
    if (!model) {
      throw new Error("Model configuration error");
    }

    const processedFiles: KnowledgeFile[] = [];
    const now = Date.now();
    const { onProgress } = options || {};

    // 计算总的处理步骤数（读取文件 + 处理每个文件的块）
    const totalSteps = filePaths.length * 2; // 文件读取和处理两个步骤
    let currentStep = 0;

    // 读取所有文件
    onProgress?.({
      progress: 0,
      status: "Reading files...",
    });

    const files = await Promise.all(
      filePaths.map(async (file) => {
        const content = await cmd.invoke<string>("read_file_text", {
          path: file.path,
        });
        currentStep++;
        onProgress?.({
          progress: (currentStep / totalSteps) * 100,
          status: "Reading files...",
          currentFile: file.path.split("\\").pop(),
        });
        return { path: file.path, content };
      }),
    );

    // 处理每个文件
    for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
      const file = files[fileIndex];
      const fileName = file.path.split("\\").pop() || "未知文件";

      onProgress?.({
        progress: ((currentStep + fileIndex) / totalSteps) * 100,
        status: "Processing file content...",
        currentFile: fileName,
      });

      const chunks = splitTextIntoChunks(file.content, CHUNK_SIZE);
      const processedChunks: TextChunk[] = [];
      const totalChunks = chunks.length;
      const [provider, modelName] = model.split(":");
      const embeddingModel =
        EmbeddingModelManager.get(provider).create(modelName);

      for (let i = 0; i < chunks.length; i++) {
        const embedding = await embeddingModel.textToEmbedding(chunks[i]);
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

        // 更新块处理进度
        onProgress?.({
          progress:
            ((currentStep + fileIndex + (i + 1) / totalChunks) / totalSteps) *
            100,
          status: "Generating text vectors...",
          currentFile: fileName,
        });
      }

      const fileType = file.path.split(".").pop()?.toLowerCase() || "txt";
      processedFiles.push({
        name: fileName,
        content: file.content,
        file_type: fileType,
        chunks: processedChunks,
        created_at: now,
        updated_at: now,
      });
    }

    const id = gen.id();

    const knowledge = new Echo<KnowledgeProps | null>(null).indexed({
      database: Knowledge.database,
      name: id,
    });

    await knowledge.ready();

    const meta: KnowledgeMeta = {
      id,
      name:
        options?.name ||
        processedFiles[0]?.name ||
        `Knowledge_${new Date().toISOString().split("T")[0]}`,
      description: options?.description || "",
      version: KNOWLEDGE_VERSION,
      created_at: now,
      updated_at: now,
    };

    knowledge.set({
      meta,
      files: processedFiles,
    });

    Knowledge.list.set((prev) => {
      const id = meta.id;
      if (!id) {
        return prev;
      }
      return {
        ...prev,
        list: {
          ...prev.list,
          [id]: meta,
        },
      };
    });

    onProgress?.({
      progress: 100,
      status: "Processing completed",
    });

    return knowledge;
  }

  // 删除知识库
  static delete(id: string): void {
    new Echo<Knowledge | null>(null)
      .indexed({
        database: this.database,
        name: id,
      })
      .discard();
    this.list.set((prev) => {
      const { [id]: _, ...rest } = prev.list;
      return {
        ...prev,
        list: rest,
      };
    });
  }

  /** 搜索知识库
   * @param query 查询内容
   * @param knowledgeIds 知识库ID, 如果为空则搜索所有知识库
   * @returns 搜索结果
   */
  static async search(
    query: string,
    knowledgeIds: string[] = [],
  ): Promise<SearchResult[]> {
    /* 获取模型 */
    const model = SettingsManager.current.knowledge.searchModel;
    if (!model) {
      throw new Error("Model configuration error");
    }

    /* 获取查询向量 */
    const [provider, modelName] = model.split(":");
    const embeddingModel =
      EmbeddingModelManager.get(provider).create(modelName);
    const queryEmbedding = await embeddingModel.textToEmbedding(query);
    const results: SearchResult[] = [];

    /* 搜索所有知识库 */
    for (const doc of Object.values(this.list.current.list)) {
      /* 如果指定了知识库ID，则只搜索指定知识库, 否则搜索所有知识库 */
      if (knowledgeIds.length > 0 && !knowledgeIds.includes(doc.id)) {
        continue;
      }
      const knowledge = new Echo<KnowledgeProps | null>(null).indexed({
        database: this.database,
        name: doc.id,
      });

      for (const file of (await knowledge.getCurrent())?.files || []) {
        for (const chunk of file.chunks) {
          const similarity = this.cosineSimilarity(
            queryEmbedding,
            chunk.embedding,
          );
          if (similarity > SettingsManager.current.knowledge.threshold) {
            results.push({
              content: chunk.content,
              similarity,
              document_name: `${knowledge.current?.meta.name}/${file.name}`,
              document_id: doc.id,
            });
          }
        }
      }
    }

    results.sort((a, b) => b.similarity - a.similarity);
    return results.slice(0, SettingsManager.current.knowledge.limit);
  }
}
