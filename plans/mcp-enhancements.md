# MCP Enhancements

MCP server improvements, document search, and related cleanup.

## MCPO Cleanup

- [x] ~~Remove MCPO files from Gaming PC (repo clone `gaming-pc\docker\mcpo\` directory)~~ — user action below
- [x] ~~Remove MCPO from repo (`gaming-pc/docker/mcpo/`)~~
- [x] ~~Remove MCPO entry from Homepage config~~ — replaced with MCP Activity widget
- [ ] **USER ACTION:** Add Uptime Kuma entries for MCP servers (see next-steps.md for URLs)
- [ ] **USER ACTION:** Delete `C:\Server_Data\Docker\mcpo\` on Gaming PC

## Gaming PC Docker

- [ ] Fix the credsStore issue with Gaming PC so that AI agent can autonomously call commands on Gaming PC without needing user's help

## MCP Server Improvements

- [ ] Dedicated SSH key for mcp-docker (currently mounts user's SSH keys; create purpose-specific key pair)
- [ ] RAG ingestion of repo docs into Open WebUI (separate from personal document search — ADR-033)
- [ ] VSCode Copilot MCP configuration
- [ ] Git fetch/pull credentials on Gaming PC + scheduled task to keep repo clone current
- [ ] mcp-homelab: Vector search for ADRs via Qdrant — local LLM searches for relevant ADRs and returns results in one tool call (saves Claude API credits vs reading all ADRs)
- [ ] mcp-homelab: Fix ADR filename resolution — `list_decisions` returns ADR number but not the full filename, so `read_file` requires an extra search step. Either include full filenames in the index response, or make `read_file` fuzzy-match on ADR number.

## Document Search (ADR-033)

> Full implementation plan: `.claude/plans/pure-hugging-harbor.md`

- [ ] Cross-encoder reranking for document search — see reranking notes below
- [ ] Message ingestion parsers (email, Slack, Teams, SMS, voicemail) — Phase D4
- [ ] At-rest encryption for NAS document share
- [x] ~~mcp-documents: Default `source_type` to "documents"~~ — ADR-035
- [x] ~~mcp-documents: Return file name and date in search results~~ — ADR-035
- [x] ~~mcp-documents: Improve query generation~~ — LLM-guiding tool descriptions, list_tags tool, graceful tag validation (ADR-035)
- [x] ~~mcp-documents: Review all available MCP tools for optimal search UX~~ — Rewrote all tool descriptions, added list_tags tool (ADR-035)

### Cross-encoder Reranking (Deferred)

The mcp-documents code already supports optional reranking via `RERANKER_URL` env var. What's missing is a working inference server on the MacBook. Attempted approaches and why they failed (2026-02-15):

- **Infinity (`infinity-emb[all]`):** Python 3.14 on MacBook causes import errors. `optimum.bettertransformer` module not found — the `bettertransformer` extra was removed from `optimum` in v2.x and doesn't exist in v1.x either. After working around that, hit a `typer`/`click` incompatibility. Likely needs an older Python (3.11/3.12) or pinned dependency versions.
- **Ollama:** No `/api/rerank` endpoint. Reranker models only work via chat endpoint (one call per document pair = N sequential calls instead of 1 batch). Too slow.

Options to revisit:
- Create a Python 3.12 venv (`python3.12 -m venv`) if available on MacBook, retry Infinity
- Try HuggingFace TEI (Text Embeddings Inference) — supports reranking, but needs Docker (not installed on MacBook)
- Wait for Infinity to fix Python 3.14 compatibility
- Move reranking to Gaming PC if/when GPU is upgraded

## ~~mcp-dns Primary Pi-hole Investigation~~ — RESOLVED (2026-02-19)

**Root cause:** `PIHOLE_PRIMARY_URL` in mcp-dns `.env` was `http://<RPI_IP>` (port 80). Port 80 on the Pi is Caddy (reverse proxy), not Pi-hole. Pi-hole's API is on port 8088. The secondary URL correctly included its port (`:8089`).

**Fix:** Changed `PIHOLE_PRIMARY_URL=http://<RPI_IP>:8088` in `.env` and `.env.example`. Recreated container with `docker compose up -d mcp-dns`.
