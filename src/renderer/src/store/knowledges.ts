import { KNOWLEDGE_DATABASE } from "@/assets/const";
import { KnowledgeMeta } from "@/knowledge/Knowledge";
import { Echo } from "echo-state";

export const KnowledgesStore = new Echo<Record<string, KnowledgeMeta>>(
  {},
).indexed({
  database: KNOWLEDGE_DATABASE,
  name: KNOWLEDGE_DATABASE,
});
