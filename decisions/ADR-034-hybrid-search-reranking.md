# ADR-034: Hybrid Search with BM25 and Cross-Encoder Reranking

**Status:** Accepted
**Date:** 2026-02-15

## Context

The `search` tool in mcp-documents used pure vector similarity (Qdrant cosine distance with `nomic-embed-text` 768-dim embeddings). A query for "core stack" ranked 8 semantically-similar chunks above the one literally containing that phrase. Keyword-heavy queries suffer from this — vector search finds conceptually related content but misses exact matches.

## Decision

### Tier 1: Hybrid Search via Qdrant Built-in BM25

Use Qdrant's built-in BM25 sparse vectors (`qdrant/bm25` model) alongside dense vectors. At query time, both are searched in parallel and fused with Reciprocal Rank Fusion (RRF) via Qdrant's query API.

**Why Qdrant built-in BM25 over application-level BM25:**
- Zero new npm dependencies — tokenization and IDF calculation happen inside Qdrant
- No need to load all chunk texts into memory for a JS BM25 index
- RRF fusion is a single API call, not manual score merging
- Scales with document count without application memory growth

**Collection schema change:** Named vectors (`dense` + `bm25` sparse) replace the flat vector format. Existing collections are automatically deleted and recreated on startup — safe because the sync pipeline repopulates from Paperless in <30 seconds.

### Tier 2: Cross-Encoder Reranking via Infinity

After hybrid search returns top-N results, an optional cross-encoder pass (`bge-reranker-v2-m3`) does deep pairwise (query, document) relevance scoring. Served by Infinity inference server on MacBook Air M4.

**Why Infinity over Ollama:**
- Ollama has no `/api/rerank` endpoint — reranker models only work via the chat endpoint (one API call per document pair = N sequential calls instead of 1 batch)
- Infinity provides a batch `POST /rerank` API purpose-built for this use case
- Infinity supports Apple Silicon MPS acceleration

**Why not HuggingFace TEI:**
- TEI requires Docker, which is not installed on the MacBook
- Infinity installs cleanly via pip in a venv

**Graceful degradation:** If Infinity is unavailable, hybrid results are returned as-is (RRF-ordered). A console warning is logged but search still works.

## Consequences

**Positive:**
- Exact-phrase queries ("core stack") now rank literal matches at or near the top
- Semantic search still works — vector similarity contributes via RRF
- Cross-encoder reranking provides the highest-quality ranking for top results
- No new npm dependencies in the MCP server

**Negative:**
- Collection migration deletes all vectors on first deploy (auto-repopulated by sync)
- Infinity adds a new service to manage on the MacBook (~568MB memory)
- Reranking adds ~100-500ms latency per search query
- MacBook must be awake for reranking (same constraint as Ollama for embeddings)

**Memory budget:** qwen2.5:14b (~9GB) + nomic-embed-text (~274MB) + bge-reranker-v2-m3 (~568MB) = ~10GB of 24GB unified memory.

## Status Notes

**2026-02-15:** Tier 1 (hybrid search with BM25 + RRF) is deployed and working. Tier 2 (cross-encoder reranking) code is in place but no inference server is running — Infinity failed to install on MacBook due to Python 3.14 incompatibilities (`optimum.bettertransformer` removed, `typer`/`click` flag error). See `plans/mcp-enhancements.md` for deferred options.

## References

- ADR-033: Document Storage and Semantic Search Architecture
- Qdrant hybrid queries: https://qdrant.tech/documentation/concepts/hybrid-queries/
- Qdrant BM25 inference: https://qdrant.tech/documentation/concepts/inference/
- Infinity inference: https://github.com/michaelfeil/infinity
