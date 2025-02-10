// import { gen } from "@/utils/generator";
// import { tool } from "@/services/tool/Tool";

// import { join } from "path";

// /** 笔记存储目录 */
// const noteDir = "./notes";
// /** 笔记索引文件路径 */
// const indexPath = join(noteDir, "index.json");

// interface NoteMetadata {
//   id: string;
//   title: string;
//   createdAt: string;
//   updatedAt: string;
//   tags?: string[];
//   description?: string;
// }

// interface NoteContent extends NoteMetadata {
//   content: string;
// }

// /** 笔记工具类 */
// export class Note {
//   constructor() {
//     // 确保笔记目录存在
//     if (!existsSync(noteDir)) {
//       mkdirSync(noteDir, { recursive: true });
//     }
//     // 确保索引文件存在
//     if (!existsSync(indexPath)) {
//       writeFileSync(indexPath, JSON.stringify([], null, 2));
//     }
//   }

//   private static getNotePath(id: string): string {
//     return join(noteDir, `${id}.md`);
//   }

//   private static readIndex(): NoteMetadata[] {
//     return JSON.parse(readFileSync(indexPath, "utf8"));
//   }

//   private static writeIndex(metadata: NoteMetadata[]): void {
//     writeFileSync(indexPath, JSON.stringify(metadata, null, 2));
//   }

//   @tool("添加新笔记索引", {
//     title: {
//       type: "string",
//       description: "笔记标题",
//       required: true,
//     },
//     description: {
//       type: "string",
//       description: "笔记描述",
//       required: false,
//     },
//     tags: {
//       type: "array",
//       items: { type: "string" },
//       description: "笔记标签",
//       required: false,
//     },
//   })
//   add(args: {
//     title: string;
//     description?: string;
//     tags?: string[];
//   }): NoteMetadata {
//     const id = gen.id();
//     const now = new Date().toISOString();

//     const metadata: NoteMetadata = {
//       id,
//       title: args.title,
//       description: args.description,
//       tags: args.tags || [],
//       createdAt: now,
//       updatedAt: now,
//     };

//     // 写入笔记文件（Markdown格式）
//     writeFileSync(Note.getNotePath(id), "");

//     // 更新索引
//     const index = Note.readIndex();
//     index.push(metadata);
//     Note.writeIndex(index);

//     return metadata;
//   }

//   @tool("删除笔记", {
//     id: {
//       type: "string",
//       description: "笔记ID",
//       required: true,
//     },
//   })
//   delete(args: { id: string }): { success: boolean } {
//     const notePath = Note.getNotePath(args.id);
//     if (!existsSync(notePath)) {
//       throw new Error("笔记不存在");
//     }

//     // 删除笔记文件
//     unlinkSync(notePath);

//     // 更新索引
//     const index = Note.readIndex().filter((note) => note.id !== args.id);
//     Note.writeIndex(index);

//     return { success: true };
//   }

//   @tool("添加笔记正文", {
//     id: {
//       type: "string",
//       description: "笔记ID",
//       required: true,
//     },
//     content: {
//       type: "string",
//       description: "要追加的笔记正文",
//       required: true,
//     },
//   })
//   edit(args: { id: string; content: string }): NoteMetadata {
//     const notePath = Note.getNotePath(args.id);
//     if (!existsSync(notePath)) {
//       throw new Error("笔记不存在");
//     }

//     // 读取现有笔记内容
//     const existingContent = readFileSync(notePath, "utf8");

//     // 更新索引
//     const index = Note.readIndex();
//     const noteIndex = index.findIndex((note) => note.id === args.id);

//     if (noteIndex === -1) {
//       throw new Error("笔记索引不存在");
//     }

//     const now = new Date().toISOString();

//     // 在现有内容后追加新内容，添加两个换行符确保格式正确
//     const newContent =
//       existingContent + (existingContent ? "\n\n" : "") + args.content;
//     writeFileSync(notePath, newContent);

//     // 更新索引
//     index[noteIndex] = {
//       ...index[noteIndex],
//       updatedAt: now,
//     };
//     Note.writeIndex(index);

//     return index[noteIndex];
//   }

//   @tool("读取笔记", {
//     id: {
//       type: "string",
//       description: "笔记ID",
//       required: true,
//     },
//   })
//   read(args: { id: string }): NoteContent {
//     const notePath = Note.getNotePath(args.id);
//     if (!existsSync(notePath)) {
//       throw new Error("笔记不存在");
//     }
//     // 读取笔记文件
//     const content = readFileSync(notePath, "utf8");
//     const titleMatch = content.match(/^# (.*)\n/);
//     const mdContent = titleMatch
//       ? content.slice(titleMatch[0].length).trim()
//       : content;

//     // 读取元数据
//     const metadata = Note.readIndex().find((note) => note.id === args.id);
//     if (!metadata) {
//       throw new Error("笔记元数据不存在");
//     }

//     return {
//       ...metadata,
//       content: mdContent,
//     };
//   }

//   @tool("列出所有笔记", {
//     tag: {
//       type: "string",
//       description: "按标签筛选（可选）",
//       required: false,
//     },
//   })
//   list(args?: { tag?: string }): NoteMetadata[] {
//     const index = Note.readIndex();
//     if (args?.tag && args.tag.length > 0) {
//       return index.filter((note) => note.tags?.includes(args.tag!));
//     }
//     return index;
//   }
// }
