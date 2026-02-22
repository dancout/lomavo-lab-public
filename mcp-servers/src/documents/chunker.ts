/**
 * Text splitting for document chunks.
 * Splits on paragraph/sentence boundaries with overlap for context continuity.
 */

export interface TextChunk {
  text: string;
  index: number;
}

export function chunkText(
  text: string,
  maxChars = 1000,
  overlap = 200,
): TextChunk[] {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return [];
  if (cleaned.length <= maxChars) {
    return [{ text: cleaned, index: 0 }];
  }

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;

  while (start < cleaned.length) {
    let end = start + maxChars;

    if (end < cleaned.length) {
      // Try to break at sentence boundary
      const slice = cleaned.slice(start, end);
      const lastPeriod = slice.lastIndexOf('. ');
      const lastNewline = slice.lastIndexOf('\n');
      const breakPoint = Math.max(lastPeriod, lastNewline);

      if (breakPoint > maxChars * 0.5) {
        end = start + breakPoint + 1;
      }
    } else {
      end = cleaned.length;
    }

    chunks.push({ text: cleaned.slice(start, end).trim(), index });
    index++;

    // If we've reached the end of the text, we're done
    if (end >= cleaned.length) break;

    start = end - overlap;
  }

  return chunks;
}
