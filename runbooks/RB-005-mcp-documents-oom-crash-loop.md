# RB-005: mcp-documents OOM Crash Loop

**Date**: 2026-02-15
**Machine**: Gaming PC (Docker)
**Service**: mcp-documents
**Impact**: Container restart-looping every ~60 seconds, JavaScript heap exhausting 4GB RAM

## Symptoms

- `docker ps` shows mcp-documents with "Up 6 seconds" (constant restarts)
- Container logs show `FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory`
- Crash occurs ~60 seconds after startup (30s startup delay + sync trigger)
- Other MCP server containers are stable at ~27MB RAM

## Root Cause 1: Infinite Loop in Text Chunker

The `chunkText()` function in `mcp-servers/src/documents/chunker.ts` had an infinite loop edge case:

```typescript
// Bug: when remaining text length equals overlap (200 chars),
// end = cleaned.length, then start = end - overlap = same start value
// → infinite loop generating millions of identical chunks
while (start < cleaned.length) {
  let end = start + maxChars;
  // ... if end >= cleaned.length, set end = cleaned.length
  chunks.push({ text: cleaned.slice(start, end).trim(), index });
  start = end - overlap;  // <-- produces same start when end == start + overlap
}
```

With the default `overlap=200` and `maxChars=1000`, any document with a final segment of exactly 200 characters would trigger this. The loop ran 6.4M+ iterations, generating identical chunks until the heap was exhausted.

**Fix**: Break immediately after pushing the last chunk:
```typescript
chunks.push({ text: cleaned.slice(start, end).trim(), index });
index++;
if (end >= cleaned.length) break;  // <-- added
start = end - overlap;
```

## Root Cause 2: Silent Qdrant Upsert Failures

Even after fixing the OOM, syncs reported success but Qdrant had 0 points. Two issues:

1. **Invalid point IDs**: Qdrant requires UUID or unsigned integer IDs. Our code used arbitrary strings like `"doc-1-0"`, which Qdrant rejected.
2. **No error checking**: `httpPut` doesn't throw on non-2xx responses. Qdrant returned error details in the response body, but we never checked.

**Fix** (`qdrant-client.ts`):
- Added `toUUID()` — deterministic MD5 hash formatted as UUID for each logical key
- Store original key as `point_key` in payload for filtering/lookup
- Added error checking: throw on HTTP 400+ or Qdrant error status in response body

## Diagnosis Steps

1. Check container uptime: `docker ps | grep mcp-documents` — "Up X seconds" indicates restart loop
2. Check logs: `docker logs mcp-documents --tail 50` — look for OOM or error messages
3. Check memory: `docker stats mcp-documents --no-stream` — should be ~27-30MB, not climbing
4. Check Qdrant points: `curl -H "api-key: KEY" http://localhost:6333/collections/documents` — `points_count` should be > 0
5. Verify payloads: `curl -X POST ... /points/scroll` with `with_payload: true` — check `point_key` field exists

## Prevention

- Text chunking functions must handle the edge case where remaining text equals the overlap size
- Always check HTTP response status codes when calling external APIs, even on PUT/POST
- Qdrant point IDs must be UUIDs or unsigned integers — never arbitrary strings
- Add memory limits to containers (`NODE_OPTIONS=--max-old-space-size=512`) as a safety net during development
