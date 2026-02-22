/**
 * Cross-encoder reranker client for Infinity inference server.
 * Sends (query, document) pairs to POST /rerank for deep pairwise relevance scoring.
 * Optional — if unavailable, hybrid search results are returned as-is.
 */

import { httpPost } from '../shared/http-client.js';

interface InfinityRerankResponse {
  results: {
    index: number;
    relevance_score: number;
  }[];
}

export class RerankerClient {
  constructor(
    private baseUrl: string,
    private model: string,
  ) {}

  /**
   * Rerank documents by relevance to query using cross-encoder scoring.
   * Returns indices into the original documents array, sorted by relevance (highest first).
   */
  async rerank(query: string, documents: string[], topN: number): Promise<number[]> {
    const resp = await httpPost<InfinityRerankResponse>(
      `${this.baseUrl}/rerank`,
      {
        model: this.model,
        query,
        documents,
        top_n: topN,
      },
    );

    return resp.data.results
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map((r) => r.index);
  }
}
