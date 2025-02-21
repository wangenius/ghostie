/**
 * 文本分块
 * @param text 文本内容
 * @param chunkSize 块大小
 * @returns 分块后的文本数组
 */
export function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];

  // 首先按段落分割（连续的换行符）
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let currentChunk = "";
  let currentLength = 0;

  for (const paragraph of paragraphs) {
    const paragraphTrimmed = paragraph.trim();

    // 如果当前段落加上已有内容超过块大小，保存当前块并开始新块
    if (currentLength + paragraphTrimmed.length > chunkSize && currentChunk) {
      chunks.push(currentChunk.trim());
      currentChunk = "";
      currentLength = 0;
    }

    // 如果单个段落超过块大小
    if (paragraphTrimmed.length > chunkSize) {
      // 先保存当前块
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
        currentLength = 0;
      }

      // 按句子分割长段落
      const sentences = paragraphTrimmed
        .split(/(?<=[.。!?！？])\s*(?=[^a-z])|(?<=[。！？])|(?<=[.!?])\s*$/)
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim());

      let sentenceChunk = "";
      let sentenceLength = 0;

      for (const sentence of sentences) {
        if (sentenceLength + sentence.length > chunkSize) {
          if (sentenceChunk) {
            chunks.push(sentenceChunk.trim());
            sentenceChunk = "";
            sentenceLength = 0;
          }
          // 如果单个句子超过块大小，直接作为一个块
          if (sentence.length > chunkSize) {
            chunks.push(sentence);
          } else {
            sentenceChunk = sentence;
            sentenceLength = sentence.length;
          }
        } else {
          if (sentenceChunk) {
            sentenceChunk += " ";
            sentenceLength += 1;
          }
          sentenceChunk += sentence;
          sentenceLength += sentence.length;
        }
      }

      if (sentenceChunk) {
        chunks.push(sentenceChunk.trim());
      }
    } else {
      // 处理正常大小的段落
      if (currentChunk) {
        currentChunk += "\n\n";
        currentLength += 2;
      }
      currentChunk += paragraphTrimmed;
      currentLength += paragraphTrimmed.length;
    }
  }

  // 处理最后一个块
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks.filter((chunk) => chunk.length > 0);
}
