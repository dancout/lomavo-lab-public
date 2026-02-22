/**
 * mcp-documents: Semantic search over personal documents and messages.
 *
 * Privacy: This server handles ultra-sensitive personal data (contracts, taxes, etc.).
 * It is NOT added to Claude Code's .mcp.json — only accessible via self-hosted LLM
 * through Open WebUI. See ADR-033.
 *
 * Tools:
 * - search: Semantic search across documents and messages
 * - get_document: Get full text of a Paperless document
 * - list_documents: List/filter documents in Paperless
 * - list_tags: Enumerate all Paperless tags for discovery
 * - sync_documents: Manually trigger Paperless → Qdrant sync
 * - get_sync_status: Last sync time, document count, vector count
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { startServer } from '../shared/server-factory.js';
import { PaperlessClient } from './paperless-client.js';
import { QdrantClient } from './qdrant-client.js';
import { EmbeddingClient } from './embeddings.js';
import { RerankerClient } from './reranker.js';
import { SyncPipeline } from './sync.js';

// --- Config from environment ---

const paperlessUrl = process.env.PAPERLESS_URL || 'http://paperless:8000';
const paperlessToken = process.env.PAPERLESS_TOKEN || '';
const qdrantUrl = process.env.QDRANT_URL || 'http://qdrant:6333';
const qdrantApiKey = process.env.QDRANT_API_KEY || '';
const ollamaUrl = process.env.OLLAMA_URL || 'http://host.docker.internal:11434';
const embeddingModel = process.env.EMBEDDING_MODEL || 'nomic-embed-text';
const rerankerUrl = process.env.RERANKER_URL || '';
const rerankerModel = process.env.RERANKER_MODEL || 'BAAI/bge-reranker-v2-m3';

// --- Clients ---

const paperless = new PaperlessClient(paperlessUrl, paperlessToken);
const qdrant = new QdrantClient(qdrantUrl, qdrantApiKey);
const embeddings = new EmbeddingClient(ollamaUrl, embeddingModel);
const reranker = rerankerUrl ? new RerankerClient(rerankerUrl, rerankerModel) : null;
const syncPipeline = new SyncPipeline(paperless, qdrant, embeddings);

if (reranker) {
  console.log(`Reranker enabled: ${rerankerUrl} (model: ${rerankerModel})`);
} else {
  console.log('Reranker not configured — hybrid search results will not be reranked');
}

// --- Auto-sync (every 5 minutes) ---

let syncInterval: ReturnType<typeof setInterval> | null = null;

function startAutoSync(): void {
  // Initial sync after 30s (let services start up)
  setTimeout(() => {
    syncPipeline.sync().catch((err) =>
      console.error('Auto-sync failed:', err),
    );
  }, 30_000);

  syncInterval = setInterval(() => {
    syncPipeline.sync().catch((err) =>
      console.error('Auto-sync failed:', err),
    );
  }, 5 * 60 * 1000);
}

// --- Tool registration ---

function registerTools(server: McpServer): void {
  server.tool(
    'search',
    `Hybrid search (BM25 keyword + vector similarity) across personal documents stored in Paperless-ngx. Returns relevant text chunks with title, filename, date, tags, and document ID.

SEARCH TIPS:
- Use broad, simple queries (e.g. "tax return" not "tax returns last year"). The search handles semantic matching.
- Do NOT guess tag names — they will silently reduce results. Call list_tags first to see valid tags.
- Dates are document upload/creation dates in Paperless, not necessarily the content date (e.g. a 2024 tax return may have been uploaded in 2025).
- If no results, simplify: remove tags and date filters, broaden the query.
- Use the document ID from results to call get_document for full text.`,
    {
      query: z.string().describe('Search query — use broad terms (e.g. "tax return", "mortgage", "W2"). Semantic matching handles variations.'),
      source_type: z.enum(['document', 'message', 'all']).default('document')
        .describe('Source type to search. Default: "document". Only use "all" or "message" if message ingestion has been set up.'),
      tags: z.array(z.string()).optional()
        .describe('Filter by exact Paperless tag names. MUST match exactly — call list_tags first to discover valid names. Invalid tags are ignored with a warning.'),
      date_after: z.string().optional()
        .describe('Only results uploaded/created after this date (ISO 8601). Note: this is the Paperless creation date, not the document content date.'),
      date_before: z.string().optional()
        .describe('Only results uploaded/created before this date (ISO 8601). Note: this is the Paperless creation date, not the document content date.'),
      limit: z.number().optional()
        .describe('Max results to return (default: 10, max: 50)'),
    },
    async ({ query, source_type, tags, date_after, date_before, limit }) => {
      try {
        const vector = await embeddings.embedSingle(query);
        const searchLimit = Math.min(limit || 10, 50);
        // Over-fetch for reranking (3x if reranker available)
        const fetchLimit = reranker ? Math.min(searchLimit * 3, 50) : searchLimit;

        // Build Qdrant filter
        const must: Record<string, unknown>[] = [];

        // Exclude hash markers from search results
        must.push({
          must_not: [{ key: 'source_type', match: { value: 'hash_marker' } }],
        });

        if (source_type && source_type !== 'all') {
          must.push({ key: 'source_type', match: { value: source_type } });
        }
        const invalidTags: string[] = [];
        if (tags?.length) {
          const allTags = await paperless.listTags();
          const tagNameSet = new Set(allTags.map((t) => t.name.toLowerCase()));
          for (const tag of tags) {
            if (tagNameSet.has(tag.toLowerCase())) {
              // Find the canonical name for case-insensitive match
              const canonical = allTags.find((t) => t.name.toLowerCase() === tag.toLowerCase())!.name;
              must.push({ key: 'tags', match: { value: canonical } });
            } else {
              invalidTags.push(tag);
            }
          }
        }
        if (date_after) {
          must.push({ key: 'created_date', range: { gte: date_after } });
        }
        if (date_before) {
          must.push({ key: 'created_date', range: { lte: date_before } });
        }

        const filter = must.length > 0 ? { must } : undefined;

        // Search both collections
        const collections = source_type === 'message' ? ['messages'] :
          source_type === 'document' ? ['documents'] :
          ['documents', 'messages'];

        let allResults: { score: number; text: string; meta: string }[] = [];

        for (const collection of collections) {
          try {
            const results = await qdrant.hybridSearch(collection, vector, query, fetchLimit, filter);
            for (const r of results) {
              const payload = r.payload;
              const meta = formatResultMeta(payload);
              allResults.push({
                score: r.score,
                text: String(payload.text || ''),
                meta,
              });
            }
          } catch {
            // Collection may not exist yet
          }
        }

        // Sort by RRF score
        allResults.sort((a, b) => b.score - a.score);

        // Rerank with cross-encoder if available
        if (reranker && allResults.length > 0) {
          try {
            const rerankedIndices = await reranker.rerank(
              query,
              allResults.map((r) => r.text),
              searchLimit,
            );
            allResults = rerankedIndices.map((idx) => allResults[idx]);
          } catch (error) {
            console.warn('Reranking failed, using hybrid results as-is:', error);
          }
        }

        const topResults = allResults.slice(0, searchLimit);

        const warnings: string[] = [];
        if (invalidTags.length > 0) {
          warnings.push(`Note: Tag(s) not found and ignored: ${invalidTags.map((t) => `"${t}"`).join(', ')}. Use list_tags to see valid tags.`);
        }

        if (topResults.length === 0) {
          const noResultsLines = ['No results found.'];
          if (warnings.length > 0) noResultsLines.push('', ...warnings);
          return { content: [{ type: 'text' as const, text: noResultsLines.join('\n') }] };
        }

        const lines = [`Found ${topResults.length} results:\n`];
        if (warnings.length > 0) {
          lines.push(...warnings, '');
        }
        for (let i = 0; i < topResults.length; i++) {
          const r = topResults[i];
          lines.push(`**${i + 1}. ${r.meta}** (score: ${r.score.toFixed(3)})`);
          lines.push(r.text);
          lines.push('');
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Search failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_document',
    'Get the full text content of a specific Paperless document by its ID. Use this after search identifies a relevant document — the document ID is included in search results. Returns complete OCR text, title, filename, date, and tags.',
    {
      document_id: z.number().describe('Paperless document ID (from search results "ID: N")'),
    },
    async ({ document_id }) => {
      try {
        const doc = await paperless.getDocument(document_id);
        const tags = await paperless.listTags();
        const tagNames = doc.tags
          .map((tid) => tags.find((t) => t.id === tid)?.name)
          .filter(Boolean);

        const lines = [
          `### ${doc.title}`,
          `ID: ${doc.id}`,
          `Created: ${new Date(doc.created).toLocaleDateString()}`,
          `File: ${doc.original_file_name}`,
        ];
        if (tagNames.length > 0) lines.push(`Tags: ${tagNames.join(', ')}`);
        lines.push('', '---', '', doc.content || '(no text content)');

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get document: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_documents',
    'Browse and discover documents in Paperless-ngx. Use this when semantic search returns no results and you want to see what documents exist, or to browse by tag. Returns document titles, filenames, dates, and IDs. For finding specific content within documents, use search instead.',
    {
      tag: z.string().optional().describe('Filter by exact tag name (case-insensitive). Call list_tags first to discover valid names.'),
      page: z.number().optional().describe('Page number (default: 1)'),
      page_size: z.number().optional().describe('Results per page (default: 25, max: 100)'),
    },
    async ({ tag, page, page_size }) => {
      try {
        let tagId: number | undefined;
        if (tag) {
          const tags = await paperless.listTags();
          const found = tags.find((t) => t.name.toLowerCase() === tag.toLowerCase());
          if (!found) {
            return { content: [{ type: 'text' as const, text: `Tag "${tag}" not found.` }] };
          }
          tagId = found.id;
        }

        const resp = await paperless.listDocuments({
          tags: tagId ? [tagId] : undefined,
          page: page || 1,
          page_size: Math.min(page_size || 25, 100),
          ordering: '-created',
        });

        if (resp.results.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No documents found.' }] };
        }

        const lines = [`Found ${resp.count} documents (showing ${resp.results.length}):\n`];
        for (const doc of resp.results) {
          const date = new Date(doc.created).toLocaleDateString();
          lines.push(`- [${doc.id}] ${doc.title} (${date}) — ${doc.original_file_name}`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to list documents: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'sync_documents',
    'Manually trigger document sync from Paperless-ngx to the vector database. Only needed if recently uploaded documents are not appearing in search results — auto-sync runs every 5 minutes.',
    {},
    async () => {
      try {
        const status = await syncPipeline.sync();
        const lines = [
          '### Sync Complete',
          `Documents processed: ${status.documentsProcessed}`,
          `Total chunks: ${status.chunksTotal}`,
          `Last sync: ${status.lastSync}`,
        ];
        if (status.errors.length > 0) {
          lines.push(`\nErrors (${status.errors.length}):`);
          for (const err of status.errors.slice(0, 10)) {
            lines.push(`  - ${err}`);
          }
        }
        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Sync failed: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'list_tags',
    'List all available Paperless-ngx tags. Call this BEFORE using tag filters in search — tag names must match exactly. Returns all tag names sorted alphabetically.',
    {},
    async () => {
      try {
        const tags = await paperless.listTags();
        const sorted = tags.map((t) => t.name).sort((a, b) => a.localeCompare(b));

        if (sorted.length === 0) {
          return { content: [{ type: 'text' as const, text: 'No tags found in Paperless.' }] };
        }

        const lines = [`Found ${sorted.length} tags:\n`];
        for (const name of sorted) {
          lines.push(`- ${name}`);
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to list tags: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );

  server.tool(
    'get_sync_status',
    'Get the current sync status (last sync time, document count, vector count)',
    {},
    async () => {
      try {
        const status = syncPipeline.getStatus();
        const docsInfo = await qdrant.getCollectionInfo('documents');
        const msgsInfo = await qdrant.getCollectionInfo('messages');

        const lines = [
          '### Sync Status',
          `In progress: ${status.inProgress ? 'Yes' : 'No'}`,
          `Last sync: ${status.lastSync || 'Never'}`,
          `Documents processed: ${status.documentsProcessed}`,
          `Total chunks: ${status.chunksTotal}`,
        ];

        if (docsInfo) {
          lines.push(`\n### Documents Collection`);
          lines.push(`  Status: ${docsInfo.status}`);
          lines.push(`  Points: ${docsInfo.pointsCount}`);
        }

        if (msgsInfo) {
          lines.push(`\n### Messages Collection`);
          lines.push(`  Status: ${msgsInfo.status}`);
          lines.push(`  Points: ${msgsInfo.pointsCount}`);
        }

        if (status.errors.length > 0) {
          lines.push(`\nRecent errors (${status.errors.length}):`);
          for (const err of status.errors.slice(0, 5)) {
            lines.push(`  - ${err}`);
          }
        }

        return { content: [{ type: 'text' as const, text: lines.join('\n') }] };
      } catch (error) {
        return {
          content: [{ type: 'text' as const, text: `Failed to get status: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        };
      }
    },
  );
}

// --- Helpers ---

function formatResultMeta(payload: Record<string, unknown>): string {
  const source = payload.source_type as string;
  if (source === 'document') {
    const title = payload.title as string || 'Untitled';
    const filename = payload.original_file_name as string || '';
    const tags = (payload.tags as string[])?.join(', ') || '';
    const date = payload.created_date ? new Date(payload.created_date as string).toLocaleDateString() : '';
    const docId = payload.document_id as number | undefined;
    const parts = [title];
    if (filename) parts.push(`(${filename})`);
    if (date) parts.push(date);
    if (tags) parts.push(`[${tags}]`);
    if (docId !== undefined) parts.push(`ID: ${docId}`);
    return parts.join(' — ');
  }
  if (source === 'message') {
    const sender = payload.sender as string || 'Unknown';
    const subject = payload.subject as string || '';
    const timestamp = payload.timestamp ? new Date(payload.timestamp as string).toLocaleDateString() : '';
    const parts = [sender];
    if (subject) parts.push(subject);
    if (timestamp) parts.push(timestamp);
    return parts.join(' — ');
  }
  return String(payload.title || payload.source || 'Unknown');
}

// --- Start ---

const PORT = parseInt(process.env.PORT || '8775', 10);

startServer({
  name: 'mcp-documents',
  version: '1.0.0',
  port: PORT,
  registerTools,
});

startAutoSync();
