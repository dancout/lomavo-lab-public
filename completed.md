# Completed Work

Archive of completed milestones. For full history, see git log.

## February 2026

**MCP Tool Call Grafana Dashboards (Feb 9)**
- Created "MCP Tools - Overview" dashboard: stat panels, time series by server, pie chart, recent calls table
- Created "MCP Tools - Detail" dashboard: per-tool breakdown, p50/p95 latency, log viewer, server filter variable
- Added MCP Activity iframe widget to Homepage (replaced MCPO entry)
- Fixed MCP structured logging: `res.on('finish')` instead of `res.on('close')` for HTTP keep-alive

**Ollama Inference Moved to MacBook Air M4 (Feb 7)**
- Gaming PC CPU-only inference too slow for interactive use (even 7B models)
- Installed Ollama on MacBook Air M4 (24GB unified memory) via Homebrew
- Open WebUI on Gaming PC points to MacBook (`OLLAMA_BASE_URL=http://<MACBOOK_IP>:11434`)
- Created `macbook/README.md` with setup and explicit switchover instructions
- Updated ADR-026 with temporary MacBook architecture

**Phase 3C/3D: Remaining MCP Servers + Open WebUI Integration (Feb 7)**
- Built `mcp-immich`: photo search, albums, job control (port 8772)
- Built `mcp-dns`: Pi-hole stats, blocking, query log for both instances (port 8773)
- Built `mcp-docker`: container management across Pi/NAS/Gaming PC via SSH (port 8774)
- All 5 MCP servers deployed on Gaming PC, verified via Claude Code
- Open WebUI v0.6.31+ supports native MCP (Streamable HTTP) — MCPO proxy not needed
- Configured all 5 MCP servers in Open WebUI admin settings
- Added `get_metric_history` high-level tool to mcp-monitoring for small LLM usability
- Set `TZ=America/Detroit` on all MCP containers for correct timestamps

**Phase 3A/3B: LLM + MCP Servers (Feb 7)**
- Deployed Ollama (CPU-only) and Open WebUI on Gaming PC for local LLM chat
- Built `mcp-homelab` MCP server: repo/docs search, file reading, service inventory
- Built `mcp-monitoring` MCP server: PromQL queries, Loki log search, Grafana alerts
- TypeScript MCP servers using Streamable HTTP transport on Gaming PC
- Claude Code `.mcp.json` configured for remote MCP access
- Added AI & MCP section to Homepage dashboard
- ADR-026: Ollama Local LLM Deployment
- ADR-027: MCP Server Architecture

**Monitoring Stack (Feb 6)**
- Deployed Prometheus + Grafana + Loki on NAS
- Discord alerting for critical/warning thresholds
- Centralized container logs via Loki + Promtail on all 3 machines
- Custom glances-exporter for Pi and NAS Prometheus metrics
- Gaming PC Promtail deployed from console
- ADR-025: Prometheus + Grafana + Loki Monitoring Stack

## February 2025

**Network Homepage Improvements**
- Added Tailscale networking to homepage widget
- ADR-019: Network stats dotnet api

**Hardware Anonymity (Feb 1)**
- Removed all sensitive IP addresses and port numbers and extracted to config or .env files
- Templatized the repo so that it could be shared with others as a starting point
- ADR-018: sensitize data placeholders

**Immich Jobs Monitoring (Feb 1)**
- Created `immich-jobs-proxy` service on Pi to aggregate Immich job queue counts
- Added Immich Jobs widget to Homepage (Active/Waiting/Failed totals)
- Added Pi Containers widget via Glances
- Enabled cgroup memory on Pi for container memory metrics
- Added auto-restart to `metrics-endpoint.ps1` on Gaming PC
- ADR-017: Immich Jobs Monitoring via Custom Proxy

## January 2025

**Phase 1 Complete: Network & Storage Foundation**
- Network: TrendNet 2.5G switch deployed, all machines hardlinked
- NAS: QNAP TS-433 configured with RAID 5 (~9TB usable), Container Station, SSH access
- Immich: Migrated to NAS storage (thumbnails/DB on SSD per ADR-011)
- Docker: Auto-start on Gaming PC boot (ADR-015)
- VaultWarden: Backups moved to NAS (ADR-013)

**Monitoring Infrastructure**
- Glances deployed on Pi, Gaming PC, and NAS
- PowerShell + LibreHardwareMonitor on Gaming PC (ADR-016)
- Homepage widgets for all machines (CPU, RAM, storage, temps, network)
- Uptime Kuma monitoring all services

**Documentation Overhaul**
- Restructured CLAUDE.md for session efficiency
- Created CONTRIBUTING.md with merge checklist
- Established ADR process and created ADRs 001-017
