# ADR-033: Document Storage and Semantic Search Architecture

**Status**: Accepted

**Date**: 2026-02-15

## Context

Personal documents (contracts, taxes, insurance, car docs) and freeform messages (emails, Slack, Teams, texts, voicemail transcripts) need a searchable home. The goal is semantic search so a **self-hosted LLM** can answer questions like "does my health insurance cover lasik?" or "when was I talking to a recruiter from Ford?"

Key constraints:
1. **Privacy**: Documents contain ultra-sensitive data (SSNs, financial records). Must never leave the local network or be sent to external AI services.
2. **Self-hosted only**: The MCP server serving this data is NOT added to Claude Code's `.mcp.json`. It's only accessible to self-hosted models via Open WebUI.
3. **Existing infrastructure**: Gaming PC (i7, 32GB RAM) for compute, NAS (RAID 5) for storage, Ollama on MacBook for embeddings.

### Alternatives Considered

**AnythingLLM**: All-in-one solution (document ingestion + vector store + chat). Rejected because:
- Monolithic — can't swap components independently (ADR-005 modularity)
- No dedicated document management UI (no tagging, correspondents, watched folders)
- Doesn't follow our MCP server pattern (would need a separate proxy)
- Less observable (no built-in Prometheus metrics)

**ChromaDB**: Simpler vector DB. Rejected in favor of Qdrant for:
- Built-in Prometheus metrics endpoint
- Better filtering/payload support for document metadata
- Production-grade persistence

## Decision

### Component Architecture

| Component | Role | Why |
|-----------|------|-----|
| **Paperless-ngx** | Document management, OCR, tagging, web UI | Best-in-class open-source DMS with auto-classification, watched folders, and a polished UI |
| **Qdrant** | Vector database for semantic search | Prometheus metrics, API key auth, efficient payload filtering |
| **mcp-documents** | MCP server bridging Paperless + Qdrant | Follows existing TypeScript + Express + server-factory.ts pattern (ADR-027) |
| **Ollama** (existing) | Embedding generation via `nomic-embed-text` | Already deployed; 768-dim, 8192 token context |

### Deployment

All containers on Gaming PC in a dedicated `documents` Docker bridge network. Document files stored on NAS via CIFS volume (same pattern as Immich — ADR-009).

| Data | Location | Rationale |
|------|----------|-----------|
| Document files | NAS via SMB | RAID 5 protection |
| PostgreSQL DB | Gaming PC SSD | Fast random access |
| Redis | Gaming PC (Docker volume) | Ephemeral task queue |
| Qdrant vectors | Gaming PC SSD | Fast search, tiny footprint (~50-100MB) |

### Security

| Concern | Mitigation |
|---------|------------|
| Claude Code access | NOT in `.mcp.json` — Open WebUI only |
| MCP authentication | Bearer token on all MCP servers (server-factory.ts middleware) |
| Qdrant access | API key required via `QDRANT__SERVICE__API_KEY` |
| Network isolation | Dedicated `documents` Docker bridge network |
| Internet exposure | `docs.<DOMAIN>` via Caddy is LAN-only (not in Cloudflare Tunnel) |

### Qdrant on Gaming PC (not NAS)

Qdrant stays on Gaming PC because:
- Vector store is tiny (~3KB per 768-dim vector, ~50-100MB total)
- The entire documents stack requires Gaming PC to be on anyway
- Avoids NAS Docker quirks (permission issues, BusyBox limitations)
- Can move to NAS later if needed (ARM64 images available)

### Sync Pipeline

```
Paperless-ngx (OCR'd text) → chunker (1000 chars, 200 overlap) → Ollama embeddings → Qdrant
```

Auto-sync every 5 minutes + manual trigger via MCP tool.

## Consequences

**Positive:**
- Semantic search over personal documents via self-hosted LLM
- Document management UI with OCR, tagging, and classification
- Each component independently replaceable (modularity)
- Observable via Prometheus/Grafana
- Qdrant API key + MCP Bearer auth for defense in depth

**Negative:**
- ~850MB additional RAM on Gaming PC
- Requires NAS SMB share setup
- Sync pipeline adds latency (documents not instantly searchable)
- No at-rest encryption yet (follow-up item)

**Follow-up:**
- At-rest encryption for NAS document share
- Message ingestion (email, Slack, Teams, SMS) — Phase D4
- Repo docs RAG (separate from personal documents)
