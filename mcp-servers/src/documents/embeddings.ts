/**
 * Generate embeddings via Ollama /api/embed endpoint.
 * Uses nomic-embed-text model (768-dim, 8192 token context).
 */

import { httpPost } from '../shared/http-client.js';

interface OllamaEmbedResponse {
  embeddings: number[][];
}

export class EmbeddingClient {
  constructor(
    private ollamaUrl: string,
    private model: string,
  ) {}

  async embed(texts: string[]): Promise<number[][]> {
    const resp = await httpPost<OllamaEmbedResponse>(
      `${this.ollamaUrl}/api/embed`,
      { model: this.model, input: texts },
    );
    return resp.data.embeddings;
  }

  async embedSingle(text: string): Promise<number[]> {
    const vectors = await this.embed([text]);
    return vectors[0];
  }
}
