# ADR-027: MCP Server Architecture for Homelab Integration

**Status**: Accepted

**Date**: 2026-02-07

## Context

Every homelab service already exposes HTTP/JSON APIs per design principle #2 (MCP-Readiness). To enable LLM clients (Claude Code, Open WebUI + Ollama, VSCode Copilot, future Flutter app) to interact with homelab services through natural language, we need MCP (Model Context Protocol) servers that wrap these APIs.

Key design questions:
1. **Granularity:** One server per service, per domain, or monolith?
2. **Language:** TypeScript vs Python?
3. **Transport:** stdio, SSE, or Streamable HTTP?
4. **Hosting:** Local (MacBook) or remote (Gaming PC)?

## Decision

### Per-Domain MCP Servers

Five MCP servers grouped by domain, each wrapping related service APIs:

| MCP Server | Port | Wraps | Key Tools |
|---|---|---|---|
| mcp-homelab | 8770 | Git repo, docs | Search files, read docs, list services/ADRs |
| mcp-monitoring | 8771 | Prometheus, Grafana, Loki | PromQL queries, log search, alert status |
| mcp-immich | 8772 | Immich API | Photo search, job control, metadata |
| mcp-dns | 8773 | Pi-hole API (both instances) | Stats, blocklists, custom DNS records |
| mcp-docker | 8774 | Docker via SSH | Container management across all machines |

**Why per-domain (not per-service or monolith):**
- A monitoring query like "what was the CPU when that alert fired?" needs both Prometheus and Grafana APIs in one server
- 5 servers is manageable to register in any MCP client
- Each server has a clear security boundary (read-only metrics vs. Docker restart)
- Follows ADR-005 modularity — each develops/deploys independently

### TypeScript

All servers written in TypeScript using `@modelcontextprotocol/sdk`. Compile-time type safety catches integration errors before deployment. The owner's background is in strongly typed languages.

### Streamable HTTP Transport

All servers expose Streamable HTTP on `/mcp`, enabling any HTTP-capable client to connect. No stdio piping, no SSH tunnels — just a URL in the client config.

Each server also exposes `GET /health` returning `{"status": "ok"}` for Uptime Kuma monitoring and client-side validation.

### Remote Hosting on Gaming PC

All MCP servers run as Docker containers on the Gaming PC. The MacBook is purely a client — `.mcp.json` points to `http://<GAMING_PC_IP>:<port>/mcp`. This means:
- No Node.js/build tooling needed on the MacBook
- Same servers accessible from any LAN device
- Co-located with Ollama for local LLM → MCP tool use

### Project Structure

Single TypeScript package in `mcp-servers/` at the repo root with shared utilities:

```
mcp-servers/
├── package.json          # Dependencies and build scripts
├── tsconfig.json         # TypeScript configuration
├── Dockerfile            # Multi-stage build (node:20-alpine)
├── docker-compose.yml    # All MCP server services
├── .env.example          # Template for machine IPs/URLs
└── src/
    ├── shared/           # Config, HTTP client, server factory
    ├── homelab/          # mcp-homelab server
    └── monitoring/       # mcp-monitoring server
```

### Stateless Mode

Servers use stateless Streamable HTTP (no session management). Each MCP request creates a fresh server instance. This is simpler and sufficient since all tools are stateless RPC calls (query metrics, read files, etc.).

### Monitoring

- MCP server health: Uptime Kuma HTTP checks on `/health` endpoints
- Container logs: shipped to Loki via existing Gaming PC Promtail
- Ollama monitoring: Uptime Kuma HTTP check on `:11434/api/tags`

Ollama does not natively expose Prometheus-format metrics. A custom exporter could be added later (Phase 3E) similar to the glances-exporter pattern if detailed inference metrics are needed.

## Consequences

**Positive:**
- Any LLM client on the LAN can query homelab services via standard MCP protocol
- Claude Code gets native access to repo docs, metrics, and logs without SSH
- TypeScript catches API contract mismatches at compile time
- Streamable HTTP works with all MCP clients without transport adapters

**Negative:**
- MCP servers unavailable when Gaming PC is off (same limitation as Ollama — acceptable)
- Docker image build required on Gaming PC after code changes
- Per-request server creation has slight overhead (negligible for homelab traffic)

**Trade-offs:**
- Chose remote hosting over local stdio for multi-client access at the cost of network dependency
- Chose stateless over stateful transport for simplicity at the cost of no server-initiated notifications
- Deferred mcp-immich, mcp-dns, mcp-docker to Phases 3C/3D (most value from homelab + monitoring first)

## References

- ADR-005: Modular and Extensible Architecture
- ADR-026: Ollama Local LLM Deployment
- Design principles: `reference/design-principles.md`
- MCP specification: https://modelcontextprotocol.io
