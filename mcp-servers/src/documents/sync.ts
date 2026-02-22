/**
 * Sync pipeline: Paperless-ngx → chunk → embed → Qdrant.
 * Runs on a schedule and can be triggered manually via MCP tool.
 */

import { PaperlessClient, type PaperlessDocument } from './paperless-client.js';
import { QdrantClient, type QdrantPoint } from './qdrant-client.js';
import { EmbeddingClient } from './embeddings.js';
import { chunkText } from './chunker.js';
import crypto from 'crypto';

const COLLECTION = 'documents';
const VECTOR_SIZE = 768; // nomic-embed-text
const BATCH_SIZE = 10; // Embed 10 chunks at a time

export interface SyncStatus {
  lastSync: string | null;
  documentsProcessed: number;
  chunksTotal: number;
  errors: string[];
  inProgress: boolean;
}

export class SyncPipeline {
  private status: SyncStatus = {
    lastSync: null,
    documentsProcessed: 0,
    chunksTotal: 0,
    errors: [],
    inProgress: false,
  };

  constructor(
    private paperless: PaperlessClient,
    private qdrant: QdrantClient,
    private embeddings: EmbeddingClient,
  ) {}

  getStatus(): SyncStatus {
    return { ...this.status };
  }

  async ensureCollection(): Promise<void> {
    await this.qdrant.ensureCollection(COLLECTION, VECTOR_SIZE);
  }

  async sync(): Promise<SyncStatus> {
    if (this.status.inProgress) {
      return this.status;
    }

    this.status.inProgress = true;
    this.status.errors = [];
    let processed = 0;
    let totalChunks = 0;

    try {
      await this.ensureCollection();

      // Get all document IDs from Paperless
      const docIds = await this.paperless.getAllDocumentIds();

      // Get existing point keys from Qdrant to detect removed docs
      const existingKeys = await this.qdrant.getPointKeys(COLLECTION);
      const currentDocPrefixes = new Set(docIds.map((id) => `doc-${id}-`));

      // Delete points for documents that no longer exist in Paperless
      const toDelete: string[] = [];
      for (const key of existingKeys) {
        const prefix = key.match(/^doc-(\d+)-/)?.[0];
        if (prefix && !currentDocPrefixes.has(prefix)) {
          toDelete.push(key);
        }
      }
      if (toDelete.length > 0) {
        await this.qdrant.deleteByKeys(COLLECTION, toDelete);
      }

      // Process each document
      for (const docId of docIds) {
        try {
          const doc = await this.paperless.getDocument(docId);
          const chunks = await this.processDocument(doc, existingKeys);
          totalChunks += chunks;
          processed++;
        } catch (error) {
          this.status.errors.push(
            `Doc ${docId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }

      this.status.lastSync = new Date().toISOString();
      this.status.documentsProcessed = processed;
      this.status.chunksTotal = totalChunks;
    } catch (error) {
      this.status.errors.push(
        `Sync failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    } finally {
      this.status.inProgress = false;
    }

    return this.getStatus();
  }

  private async processDocument(doc: PaperlessDocument, existingKeys: Set<string>): Promise<number> {
    if (!doc.content?.trim()) return 0;

    // Hash content to detect changes
    const contentHash = crypto.createHash('md5').update(doc.content).digest('hex');
    const hashPointKey = `doc-${doc.id}-hash`;

    // Check if document content has changed by looking for the hash marker
    if (existingKeys.has(hashPointKey)) {
      // Document already synced — skip re-embedding if content unchanged
      return 0;
    }

    // Delete old chunks for this document
    const oldKeys: string[] = [];
    for (const key of existingKeys) {
      if (key.startsWith(`doc-${doc.id}-`)) {
        oldKeys.push(key);
      }
    }
    if (oldKeys.length > 0) {
      await this.qdrant.deleteByKeys(COLLECTION, oldKeys);
    }

    // Chunk the document
    const chunks = chunkText(doc.content);
    if (chunks.length === 0) return 0;

    // Get tag names for metadata
    const tags = await this.paperless.listTags();
    const tagNames = doc.tags
      .map((tid) => tags.find((t) => t.id === tid)?.name)
      .filter(Boolean) as string[];

    // Embed in batches
    const points: QdrantPoint[] = [];

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE);
      const vectors = await this.embeddings.embed(batch.map((c) => c.text));

      for (let j = 0; j < batch.length; j++) {
        // Enrich BM25 text with filename so keyword search matches filenames
        const bm25Text = doc.original_file_name
          ? `${doc.original_file_name.replace(/[_-]/g, ' ')} ${batch[j].text}`
          : batch[j].text;

        points.push({
          id: `doc-${doc.id}-${batch[j].index}`,
          vector: {
            dense: vectors[j],
            bm25: { text: bm25Text, model: 'qdrant/bm25' },
          },
          payload: {
            source: 'paperless',
            source_type: 'document',
            document_id: doc.id,
            title: doc.title,
            original_file_name: doc.original_file_name,
            tags: tagNames,
            correspondent_id: doc.correspondent,
            document_type_id: doc.document_type,
            created_date: doc.created,
            chunk_index: batch[j].index,
            text: batch[j].text,
            content_hash: contentHash,
          },
        });
      }
    }

    // Add a hash marker point (zero dense vector, no BM25 — excluded from search)
    points.push({
      id: hashPointKey,
      vector: {
        dense: new Array(VECTOR_SIZE).fill(0),
      },
      payload: {
        source: 'paperless',
        source_type: 'hash_marker',
        document_id: doc.id,
        content_hash: contentHash,
      },
    });

    await this.qdrant.upsertPoints(COLLECTION, points);
    return chunks.length;
  }
}
