# ADR-035: Document Search Improvements for LLM Usability

## Status

Accepted

## Context

A real-world failure scenario exposed 5 compounding issues in mcp-documents. A user asked about tax returns, the LLM called `search` with `query="tax returns last year"`, `tags=["1098 form"]`, `date_after="2022-01-01"` and got zero results — despite the document existing (filename: `Dan_and_Nancy_Jointly_2024_TaxReturn`).

Root causes:
1. **Guessed tag name doesn't exist** — `"1098 form"` isn't a valid Paperless tag, but the filter silently returns zero results instead of warning
2. **Tool descriptions don't guide LLMs** — smaller models (qwen2.5:14b) guess tag names, use overly specific queries, and don't know dates are upload dates
3. **No filename in search results or BM25 index** — keyword search can't match filenames, and results don't show the original filename
4. **`source_type` defaults to `'all'`** — the `'messages'` collection is empty (Phase D4 doesn't exist), wasting a search call
5. **No way to discover valid tags** — LLMs must guess tag names with no discovery mechanism

## Decision

### Default `source_type` to `'document'`

Changed the zod schema from `.optional()` (defaults to `'all'`) to `.default('document')`. Since message ingestion (Phase D4) doesn't exist, searching the empty `messages` collection wastes a call and could confuse LLMs when results only come from documents.

### Add `original_file_name` to sync payload and BM25 index

Added `original_file_name` to the Qdrant point payload so it appears in search results. Also prepend the filename (with underscores/hyphens replaced by spaces) to the BM25 text, enabling keyword matches against filenames (e.g., searching "TaxReturn" now matches `Dan_and_Nancy_Jointly_2024_TaxReturn`).

### Add `list_tags` tool

New tool that enumerates all Paperless tags alphabetically. Lets LLMs discover valid tags before filtering instead of guessing names.

### Graceful tag validation in search

Instead of silently filtering on non-existent tags (which guarantees zero results), the search handler now:
- Looks up each requested tag in Paperless (case-insensitive)
- Applies filter only for tags that exist
- Warns in results about invalid tags with a message directing to `list_tags`

This prevents the worst failure mode: a guessed tag name silently zeroing out all results.

### LLM-guiding tool descriptions

Rewrote all tool descriptions with explicit guidance:
- **search**: Added SEARCH TIPS block — use broad queries, don't guess tags, dates are upload dates not content dates
- **search parameters**: Clarified each parameter's semantics and gotchas
- **get_document**: Clarified it's for reading full text after search, document ID comes from results
- **list_documents**: Positioned as browsing/discovery fallback
- **sync_documents**: Clarified only needed when recent uploads don't appear
- **list_tags**: Positioned as prerequisite before tag filtering

### Updated result format

Search results now include filename and document ID:
- Before: `{title} — {date} — [{tags}]`
- After: `{title} — ({filename}) — {date} — [{tags}] — ID: {docId}`

Including `document_id` lets LLMs follow up with `get_document` without a second search.

## Consequences

- **Requires re-sync**: Existing Qdrant points lack `original_file_name` in payload. Hash markers must be deleted to trigger re-embedding with the new payload fields.
- **Extra API call on tag filter**: Graceful tag validation calls `paperless.listTags()` when tags are provided. This is a lightweight call (cached by Paperless) and the tradeoff vs. silent failure is clear.
- **Breaking change for `source_type`**: Callers that relied on the default `'all'` behavior now get `'document'` only. This is intentional — the `messages` collection is empty.
- **Larger BM25 text**: Prepending filename to BM25 text slightly increases index size but significantly improves keyword search recall.

## References

- ADR-033: Document Storage and Semantic Search Architecture
- ADR-034: Hybrid Search with BM25 and Cross-Encoder Reranking
