import { KNOWLEDGE_BODY_DATABASE, KNOWLEDGE_VERSION } from "@/assets/const";
import { EmbeddingModelManager } from "@/model/embedding/EmbeddingModelManger";
import { FileMetadata } from "@/page/knowledge/KnowledgeCreator";
import { gen } from "@/utils/generator";
import { cmd } from "@/utils/shell";
import { splitTextIntoChunks } from "@/utils/text";
import { Echo } from "echo-state";
import { SettingsManager } from "../settings/SettingsManager";
import { KnowledgesStore } from "@/store/knowledges";

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
export interface KnowledgeBody {
  [key: string]: KnowledgeFile;
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

export class Knowledge {
  meta: KnowledgeMeta;
  constructor(
    meta: KnowledgeMeta = {
      id: "",
      name: "",
      description: "",
      version: KNOWLEDGE_VERSION,
      created_at: 0,
      updated_at: 0,
    },
  ) {
    this.meta = meta;
  }

  static async get(id: string): Promise<Knowledge> {
    const meta = await KnowledgesStore.getCurrent();
    return new Knowledge(meta[id]);
  }

  async docs(): Promise<KnowledgeBody> {
    const docs = Echo.get<KnowledgeBody>({
      database: KNOWLEDGE_BODY_DATABASE,
      name: this.meta.id,
    });
    return docs.getCurrent();
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

  async updateMeta(meta: Partial<KnowledgeMeta>) {
    this.meta = {
      ...this.meta,
      ...meta,
    };
    KnowledgesStore.set((prev) => {
      return {
        ...prev,
        [this.meta.id]: this.meta,
      };
    });
  }

  /** 添加知识库
   * @param filePaths 文件路径
   * @param options 选项
   * @returns 知识库
   */
  static async create(
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

    const processedFiles: Record<string, KnowledgeFile> = {};
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

      const chunks = splitTextIntoChunks(
        file.content,
        SettingsManager.current.knowledge.chunkSize,
      );
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
      processedFiles[fileName] = {
        name: fileName,
        content: file.content,
        file_type: fileType,
        chunks: processedChunks,
        created_at: now,
        updated_at: now,
      };
    }

    const id = gen.id();

    const knowledge = new Echo<KnowledgeBody | null>(null).indexed({
      database: KNOWLEDGE_BODY_DATABASE,
      name: id,
    });

    await knowledge.ready();

    const meta: KnowledgeMeta = {
      id,
      name: options?.name || "UnNamed",
      description: options?.description || "",
      version: KNOWLEDGE_VERSION,
      created_at: now,
      updated_at: now,
    };

    knowledge.set(processedFiles);

    KnowledgesStore.set({ [meta.id]: meta });

    onProgress?.({
      progress: 100,
      status: "Processing completed",
    });

    return knowledge;
  }

  // 删除知识库
  static async delete(id: string): Promise<void> {
    await Echo.get<KnowledgeBody | null>({
      database: KNOWLEDGE_BODY_DATABASE,
      name: id,
    }).discard();
    KnowledgesStore.delete(id);
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

    console.log("model", model);

    /* 获取查询向量 */
    const [provider, modelName] = model.split(":");
    console.log("provider", provider);
    console.log("modelName", modelName);
    const embeddingModel =
      EmbeddingModelManager.get(provider).create(modelName);
    const queryEmbedding = await embeddingModel.textToEmbedding(query);
    console.log("queryEmbedding", queryEmbedding);
    const results: SearchResult[] = [];

    /* 搜索所有知识库 */
    for (const doc of Object.values(await KnowledgesStore.getCurrent())) {
      console.log("doc", doc);
      /* 如果指定了知识库ID，则只搜索指定知识库, 否则搜索所有知识库 */
      if (knowledgeIds.length > 0 && !knowledgeIds.includes(doc.id)) {
        continue;
      }
      const knowledge = Echo.get<KnowledgeBody>({
        database: KNOWLEDGE_BODY_DATABASE,
        name: doc.id,
      });

      console.log("knowledge", await knowledge.getCurrent());

      for (const file of Object.values((await knowledge.getCurrent()) || {})) {
        console.log("file", file);
        for (const chunk of file.chunks) {
          const similarity = Knowledge.cosineSimilarity(
            queryEmbedding,
            chunk.embedding,
          );
          console.log("similarity", similarity);
          if (similarity > SettingsManager.current.knowledge.threshold) {
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
    console.log("results", results);
    return results.slice(0, SettingsManager.current.knowledge.limit);
  }
}
