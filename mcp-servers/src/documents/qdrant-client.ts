/**
 * Typed HTTP client for Qdrant REST API.
 * Handles collection management, point upsert, and search.
 *
 * Qdrant requires point IDs to be unsigned integers or UUIDs.
 * We use deterministic UUIDs derived from logical string keys (e.g. "doc-1-0")
 * and store the original key as `point_key` in the payload for filtering.
 */

import { httpDelete, httpGet, httpPost, httpPut } from '../shared/http-client.js';
import crypto from 'crypto';

/**
 * Convert a logical string key to a deterministic UUID.
 * Uses MD5 hash formatted as UUID v4 shape.
 */
function toUUID(key: string): string {
  const hash = crypto.createHash('md5').update(key).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20, 32)}`;
}

export interface QdrantBM25Vector {
  text: string;
  model: string;
}

export interface QdrantNamedVectors {
  dense: number[];
  bm25?: QdrantBM25Vector;
}

export interface QdrantPoint {
  id: string; // Logical key (e.g. "doc-1-0") — converted to UUID for storage
  vector: number[] | QdrantNamedVectors;
  payload: Record<string, unknown>;
}

export interface QdrantSearchResult {
  id: string;
  score: number;
  payload: Record<string, unknown>;
}

interface QdrantSearchResponse {
  result: QdrantSearchResult[];
}

interface QdrantQueryResponse {
  result: {
    points: QdrantSearchResult[];
  };
}

interface QdrantCollectionInfo {
  result: {
    status: string;
    points_count: number;
    vectors_count: number;
    config: {
      params: {
        sparse_vectors?: Record<string, unknown>;
      };
    };
  };
}

interface QdrantScrollResponse {
  result: {
    points: { id: string; payload: Record<string, unknown> }[];
    next_page_offset: string | null;
  };
}

interface QdrantStatusResponse {
  status?: string | { error: string };
  result?: unknown;
}

export class QdrantClient {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  private headers(): Record<string, string> {
    return { 'api-key': this.apiKey };
  }

  async ensureCollection(name: string, vectorSize: number): Promise<void> {
    const resp = await httpGet<QdrantStatusResponse>(
      `${this.baseUrl}/collections/${name}`,
      undefined,
      this.headers(),
    );

    const exists = resp.status !== 404 &&
      !(resp.data.status && typeof resp.data.status === 'object' && 'error' in resp.data.status);

    if (exists) {
      // Check if collection has sparse vectors (new schema)
      const hasSparse = await this.hasSparseVectors(name);
      if (!hasSparse) {
        // Migrate: delete old collection, will be recreated below.
        // Safe — sync pipeline repopulates from Paperless in <30s.
        console.log(`Collection "${name}" lacks sparse vectors — deleting for migration`);
        await httpDelete<QdrantStatusResponse>(
          `${this.baseUrl}/collections/${name}`,
          this.headers(),
        );
      } else {
        return; // Collection exists with correct schema
      }
    }

    // Create collection with named dense + sparse BM25 vectors
    const createResp = await httpPut<QdrantStatusResponse>(
      `${this.baseUrl}/collections/${name}`,
      {
        vectors: {
          dense: { size: vectorSize, distance: 'Cosine' },
        },
        sparse_vectors: {
          bm25: { modifier: 'idf' },
        },
      },
      this.headers(),
    );
    if (createResp.status >= 400) {
      throw new Error(`Failed to create collection ${name}: ${JSON.stringify(createResp.data)}`);
    }
    console.log(`Created collection "${name}" with dense + BM25 sparse vectors`);
  }

  private async hasSparseVectors(name: string): Promise<boolean> {
    try {
      const resp = await httpGet<QdrantCollectionInfo>(
        `${this.baseUrl}/collections/${name}`,
        undefined,
        this.headers(),
      );
      const sparse = resp.data.result?.config?.params?.sparse_vectors;
      return sparse != null && Object.keys(sparse).length > 0;
    } catch {
      return false;
    }
  }

  async upsertPoints(collection: string, points: QdrantPoint[]): Promise<void> {
    const resp = await httpPut<QdrantStatusResponse>(
      `${this.baseUrl}/collections/${collection}/points`,
      {
        points: points.map((p) => {
          // Support both flat vectors (legacy) and named vectors
          let vector: unknown;
          if (Array.isArray(p.vector)) {
            vector = { dense: p.vector };
          } else {
            const named: Record<string, unknown> = { dense: p.vector.dense };
            if (p.vector.bm25) {
              named.bm25 = {
                text: p.vector.bm25.text,
                model: p.vector.bm25.model,
              };
            }
            vector = named;
          }
          return {
            id: toUUID(p.id),
            vector,
            payload: { ...p.payload, point_key: p.id },
          };
        }),
      },
      this.headers(),
    );

    if (resp.status >= 400 || (resp.data.status && typeof resp.data.status === 'object' && 'error' in resp.data.status)) {
      throw new Error(`Failed to upsert points: ${JSON.stringify(resp.data)}`);
    }
  }

  async search(
    collection: string,
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<QdrantSearchResult[]> {
    const body: Record<string, unknown> = {
      vector: { name: 'dense', vector },
      limit,
      with_payload: true,
    };
    if (filter) body.filter = filter;

    const resp = await httpPost<QdrantSearchResponse>(
      `${this.baseUrl}/collections/${collection}/points/search`,
      body,
      this.headers(),
    );
    return resp.data.result;
  }

  /**
   * Hybrid search using dense vectors + BM25 sparse vectors, fused with RRF.
   * Falls back to dense-only search if the query API fails.
   */
  async hybridSearch(
    collection: string,
    vector: number[],
    queryText: string,
    limit: number,
    filter?: Record<string, unknown>,
  ): Promise<QdrantSearchResult[]> {
    const prefetch = [
      {
        query: vector,
        using: 'dense',
        limit: limit * 3,
        ...(filter ? { filter } : {}),
      },
      {
        query: { text: queryText, model: 'qdrant/bm25' },
        using: 'bm25',
        limit: limit * 3,
        ...(filter ? { filter } : {}),
      },
    ];

    try {
      const resp = await httpPost<QdrantQueryResponse>(
        `${this.baseUrl}/collections/${collection}/points/query`,
        {
          prefetch,
          query: { fusion: 'rrf' },
          limit,
          with_payload: true,
        },
        this.headers(),
      );
      return resp.data.result.points;
    } catch (error) {
      console.warn('Hybrid search failed, falling back to dense-only:', error);
      return this.search(collection, vector, limit, filter);
    }
  }

  async getCollectionInfo(name: string): Promise<{ status: string; pointsCount: number; vectorsCount: number } | null> {
    try {
      const resp = await httpGet<QdrantCollectionInfo>(
        `${this.baseUrl}/collections/${name}`,
        undefined,
        this.headers(),
      );
      const info = resp.data.result;
      return {
        status: info.status,
        pointsCount: info.points_count,
        vectorsCount: info.vectors_count,
      };
    } catch {
      return null;
    }
  }

  /**
   * Get all point keys (logical IDs stored in payload.point_key) from a collection.
   */
  async getPointKeys(collection: string): Promise<Set<string>> {
    const keys = new Set<string>();
    let offset: string | null = null;

    do {
      const body: Record<string, unknown> = {
        limit: 1000,
        with_payload: { include: ['point_key'] },
        with_vector: false,
      };
      if (offset) body.offset = offset;

      const resp = await httpPost<QdrantScrollResponse>(
        `${this.baseUrl}/collections/${collection}/points/scroll`,
        body,
        this.headers(),
      );

      for (const point of resp.data.result.points) {
        const key = point.payload?.point_key;
        if (typeof key === 'string') {
          keys.add(key);
        }
      }
      offset = resp.data.result.next_page_offset;
    } while (offset);

    return keys;
  }

  async deleteByKeys(collection: string, keys: string[]): Promise<void> {
    if (keys.length === 0) return;

    const resp = await httpPost<QdrantStatusResponse>(
      `${this.baseUrl}/collections/${collection}/points/delete`,
      { points: keys.map(toUUID) },
      this.headers(),
    );

    if (resp.status >= 400) {
      throw new Error(`Failed to delete points: ${JSON.stringify(resp.data)}`);
    }
  }
}
