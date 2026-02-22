# Completed Work

Archive of completed milestones. See `plans/README.md` for future roadmap, git log for full history.

## February 2026

**Hardware Inventory Documentation (Feb 22)**
- Created `HOMELAB_PROFILE.md` — comprehensive hardware inventory and user profile for current owner
- Documented active hardware: Raspberry Pi 4, Gaming PC (MSI MPG Z390 motherboard in NZXT S340 tower), QNAP NAS, TrendNet 2.5G switch
- Documented available but undeployed resources: 1TB WD Blue SATA HDD, 500GB WD My Passport, USB thumb drives, extra Pi4/Libre Computer, WiFi/Bluetooth dongles
- Documented legacy hardware: 2011 MacBook Pro with ~400GB total (encrypted data + recovery space)
- Included hardware constraints and future expansion possibilities
- File serves as reference for planning infrastructure work and understanding resource availability
- Completes hardware profile setup started in Feb 22 "New User Onboarding" work (which created template)

**Wake-on-LAN for Gaming PC (Feb 22)**
- Configured Wake on Magic Packet in Windows NIC settings (was already enabled by default)
- Disabled Fast Startup via `powercfg /h off` — required for WoL from full shutdown
- Documented `GAMING_PC_MAC` in `.env` and `.env.example` (MAC: `00:D8:61:9D:50:7B`)
- Created `rpi/scripts/wake-gaming-pc.sh` — sends magic packet and waits for PC to respond via ping (90s timeout)
- Installed `wakeonlan` tool on Pi and deployed script to `~/scripts/`, verified working
- Updated `gaming-pc/README.md` with WoL setup section (includes BIOS step for full shutdown, Windows commands, re-enable instructions)
- Updated `infrastructure/network.md` to include `GAMING_PC_MAC` in device table
- Updated `rpi/README.md` to document scripts directory
- Added future task to `next-steps.md` Priority 2: Gaming PC auto-wake + auto-sleep (with reverse proxy on Pi to trigger on demand)
- **Remaining:** Manual BIOS setting (Wake on LAN enable, ERPReady disable) for WoL from full shutdown — user has completed this step

**New User Onboarding, Homelab Profile Setup, & .env Standardization (Feb 22)**
- Created `GETTING_STARTED.md` — positions repo as both deployed reference and reusable framework, with Quick Start, SSH prerequisites, key files reading order
- Created `HOMELAB_PROFILE.md.example` — structured template for hardware inventory, experience level, goals, deviations from reference architecture
- Created `scripts/new-user-setup.sh` — one-time activation script that archives owner's `completed.md` and `next-steps.md` to `archive/`, creates clean slate, copies `.env` and `HOMELAB_PROFILE.md` templates
- Created `archive/README.md` — explains purpose of archived files
- Updated `README.md` — reframed About section to acknowledge dual nature (deployed reference + reusable template), added Getting Started callout, updated repo structure
- Updated `CLAUDE.md` — added `HOMELAB_PROFILE.md` to "What to Read When" table, updated .env reference
- Deleted stale `.env.example` file
- Refactored env setup to use standard practice: renamed `.env.local.example` → `.env.example`, updated all docs and scripts to reference `.env` instead of `.env.local`, updated `.gitignore` to ignore `.env` (local config) and track `.env.example` (template)
- Updated `reference/file-organization.md`, `reference/deploy-commands.md`, `reference/credentials.md` for new env standards
- Created `decisions/ADR-037` documenting the decision to standardize on `.env` (industry best practice)
- Updated `decisions/README.md` with new ADR
- Resolves Priority 1 (new user confusion) and Priority 3 (homelab profile/onboarding refactor)

**Fix Custom Agents (Feb 22)**
- Fixed 4 agent files in `.claude/agents/` — added required `name` and `description` frontmatter fields, fixed `mcp_servers` → `mcpServers` (camelCase)
- Agents: researcher (haiku, read-only investigation), monitor (haiku, health checks), deployer (sonnet, service deployment), documenter (sonnet, doc updates)

**README Accuracy & Process Improvements (Feb 22)**
- Fixed 10 discrepancies in README.md: ADR count (27→36), MCP servers (5→6), service count (30+→45+)
- Updated architecture diagram to include Caddy (HTTPS reverse proxy), Paperless-ngx, Qdrant, Nest Exporter
- Updated tech stack table: added Caddy to Networking, added Documents row (Paperless + Qdrant)
- Updated repository structure: added `plans/` and `runbooks/` directories
- Updated phase status: Phase 2 (reverse proxy is DONE, only WoL remaining), Phase 3 (document search deployed)
- Added README to documentation enforcement: CLAUDE.md doc rules + merge checklist, CONTRIBUTING.md config updates, /new-service skill Phase 5, /commit skill pre-commit checks
- Prevents future drift: README now explicitly tied to 5 workflow points instead of zero

**Fuzzy Search on ADRs**
- [x] Fix mcp-homelab ADR filename resolution (include full filenames in `list_decisions` or fuzzy-match in `read_file`)

**Public Repo Sync & Sensitive Value Scrubbing (Feb 21)**
- Created `sync-to-public.sh` — copies only git-tracked files to public repo, validates no .env.local leaks, commits with date stamp (safe: user pushes manually)
- Scrubbed ~30 remaining hardcoded IPs, usernames, domains from 17 files — replaced with `<PLACEHOLDER>` format per ADR-018
- Templatized watchtower and documents docker-compose files — `<STATUS_URL>` and `<DOMAIN>` now use `${STATUS_URL}` and `${DOMAIN}` env vars
- Created `check-secrets.sh` (~0.4s scan) and `/secrets-check` skill — identifies any .env.local values exposed in tracked files (word-boundary IP matching, software-name false positive filtering)
- Improved IP matching in sync scripts to avoid substring false positives (e.g., `<EXAMPLE_IP>` inside `<EXAMPLE_RANGE>`)
- Public repo sync passed validation: 206 tracked files synced with zero leaks detected

**MCPO Cleanup (Feb 21)**
- Deleted `gaming-pc/docker/mcpo/` directory (docker-compose.yml + config.json)
- Removed MCPO row from Gaming PC services table and services inventory
- Removed MCPO directory mapping from Gaming PC README directory table
- Removed entire "MCPO (MCP-to-OpenAPI Bridge)" deployment section from Gaming PC README
- Checked off MCPO cleanup items in `plans/mcp-enhancements.md`
- Removed MCPO cleanup task from `next-steps.md`
- **User action:** Delete `C:\Server_Data\Docker\mcpo\` on Gaming PC (or agent can attempt via SSH)
- All remaining MCPO references are in historical/completed files (ADR-026, completed.md) and plan checklist

**Documentation Backfill (Feb 21)**
- Fixed WireGuard port in `infrastructure/services.md` (51820 → 51194, matching deployed config and Pi README)
- Added missing Promtail and Watchtower rows to Gaming PC services table
- Fixed MCPO status in Gaming PC README (marked as Stopped, added status note to deploy section)
- Fixed stale Watchtower note in Pi README (was "polls every 24 hours", now correctly says cron at 3 AM)
- Cleaned up completed/closed items from `next-steps.md`

**MCP Document Search Improvements (Feb 21)**
- Fixed 5 compounding issues that caused a real-world search failure (tax return query returned zero results despite document existing)
- Default `source_type` to `'document'` — `messages` collection is empty, searching it wastes a call
- Added `original_file_name` to Qdrant payload and BM25 index — keyword search now matches filenames
- New `list_tags` tool — LLMs can discover valid Paperless tags before filtering
- Graceful tag validation — invalid tag names are ignored with a warning instead of silently zeroing results
- Updated `formatResultMeta` — results now include filename and document ID for follow-up with `get_document`
- Rewrote all tool descriptions with SEARCH TIPS, parameter clarifications, and usage guidance for smaller LLMs
- Updated `/next-task` skill to require plan mode (`EnterPlanMode`/`ExitPlanMode`) for durable plans
- ADR-035: Document Search Improvements for LLM Usability

**Homepage Dashboard Completion (Feb 19)**
- Completed all feasible Homepage dashboard items (7 of 8, power tracking deferred — requires hardware)
- NEST alert threshold: changed from `for: 5m` to `for: 15m` with 20-min lookback to reduce false alarms
- Discord link: added to Cloud Services section with `HOMEPAGE_VAR_DISCORD_URL` env var
- Paperless active jobs: extended `paperless-stats-proxy` to fetch `/api/tasks/` and count active/pending/failed
- Grafana alerts proxy: new `grafana-alerts-proxy` on Pi (port 8087) queries rules API, exposes firing/pending/normal counts for Homepage widget and Prometheus `/metrics`
- Storage trends: added Prometheus scrape jobs for `paperless-stats` and `grafana-alerts`, extended `immich-jobs-proxy` with `immich_photos_total`/`immich_videos_total`/`immich_storage_bytes`, created "Storage Trends" Grafana dashboard (6 panels, 30d view)
- Outage history: created "Outage History" Grafana dashboard with alert timeline, cumulative firing duration, alert frequency, and current status
- Added absent() alerts for paperless-stats and grafana-alerts metrics
- Power consumption tracking: deferred to `plans/infrastructure.md` — needs 3x smart plugs (~$45-60)

**Future Plans Consolidation (Feb 19)**
- Split `future-plans.md` (225 lines) into `plans/README.md` (28-line index) + 7 topic files
- Topic files: homepage-dashboard, monitoring, mcp-enhancements, infrastructure, ai-and-apps, phase4-kubernetes, ideas-and-backlog
- Stripped all completed items (already tracked in `completed.md`)
- Updated all references across 14 files (CLAUDE.md, CONTRIBUTING.md, skills, agents, ADRs, READMEs)
- `/next-task` skill now reads slim index instead of full 225-line file

**Claude Code Agents & Skills (Feb 19)**
- Created 4 specialized agents in `.claude/agents/`: researcher (haiku, read-only investigation), monitor (haiku, health checks), documenter (sonnet, doc updates), deployer (sonnet, service deployment)
- Created 5 skills in `.claude/skills/`: `/next-task` (autonomous task execution), `/commit` (pre-commit verification), `/doc-update` (post-change doc sync), `/new-service` (full deployment checklist), `/branch` (feature branch lifecycle)
- Agents use scoped MCP servers (not all 5) and appropriate models (haiku for read-only, sonnet for writes)
- Skills encode CONTRIBUTING.md conventions: pre-merge checklist, task file sync, ADR creation, new service observability
- No "implementer" agent — main conversation (Opus) handles implementation with full context; deployer handles the deploy step

**MCP Tools Testing & User Actions (Feb 19)**
- Tested all 5 MCP servers via Claude Code with auth — homelab, monitoring, immich, dns, docker responding correctly
- Added Uptime Kuma monitors: Caddy, Paperless, Qdrant, mcp-documents
- Updated Pi-hole web UI bookmarks to port 8088
- Set DNS to <VIP> on MacBook and iPhone (remaining devices deferred)

**Personal Document Search System (Feb 15)**
- Phases D0–D3: MCP auth, Paperless-ngx + Qdrant infrastructure, mcp-documents server, observability
- Bearer token authentication added to all MCP servers via `server-factory.ts` middleware (`MCP_API_KEY`)
- Paperless-ngx (port 8776) for document management, OCR, tagging — documents stored on NAS via CIFS
- Qdrant vector database for semantic search, mcp-documents MCP server (port 8775) with auto-sync
- Privacy-first: mcp-documents only accessible to self-hosted LLM via Open WebUI, NOT Claude Code
- Prometheus scrape target + Grafana absent() alert for Qdrant, Homepage Paperless widget
- Caddy reverse proxy: `docs.<DOMAIN>` for LAN access to Paperless UI
- Fixed chunker infinite loop (RB-005) and Qdrant UUID point ID format
- MCP auth configured in Claude Code (`.mcp.json`) for 5 non-documents servers and Open WebUI for all 6
- End-to-end verified: upload PDF → OCR → auto-sync → Qdrant embedding → semantic search via Open WebUI
- Uptime Kuma monitors: Caddy, Paperless-ngx, Qdrant, mcp-documents
- ADR-033: Document Storage and Semantic Search Architecture

**Uptime Kuma Migrated from Pi to NAS (Feb 14)**
- Pi was severely memory-constrained (906MB RAM, 74% swap in use)
- Uptime Kuma was the heaviest container (~45MB RAM, ~13% CPU, 30-60s API response times)
- NAS has 1,830MB free RAM — migration adds minimal load
- Data migrated via SCP (SQLite DB, ~139MB)
- Caddy reverse proxy updated: `status.<DOMAIN>` now routes to NAS:3001
- Homepage widget moved from Pi section to NAS section
- All existing monitors and push URLs continue working through Caddy
- Pi Watchtower upgraded to match Gaming PC: cron schedule (3 AM daily) + push notifications to Uptime Kuma

**Watchtower Reactivated on Gaming PC (Feb 14)**
- Watchtower was stopped since January 2026 (ADR-007) due to HTTPS requirement for Uptime Kuma push notifications
- Now running with `ghcr.io/nicholas-fedor/watchtower` (active community fork, matches Pi)
- HTTPS push notifications via `https://status.<DOMAIN>` (Caddy reverse proxy, ADR-031)
- Scheduled auto-updates daily at 3 AM via cron (`WATCHTOWER_SCHEDULE=0 0 3 * * *`)
- Old images cleaned up automatically (`WATCHTOWER_CLEANUP=true`)
- Proper `.env` file for push token (resolves config mismatch from ADR-007)
- ADR-007 marked as Superseded

**Reverse Proxy: Full Coverage for All Services (Feb 14)**
- Added 8 new Caddy reverse proxy entries: `pihole-backup`, `glances-pi`, `glances-pc`, `glances-nas`, `metrics-pc`, `ollama`, `mcp`, `nas` (QNAP WebUI with `tls_insecure_skip_verify`)
- Updated 13 Homepage widget `href` values from raw `http://IP:port` to `https://*.<DOMAIN>`
- Total proxied services now 17 (up from 9). Only Xfinity Gateway remains as direct IP (can't route through Pi)
- All TLS certs obtained via Cloudflare DNS-01 challenge

**Reverse Proxy with Caddy & Split-Horizon DNS (Feb 12)**
- Deployed Caddy v2 reverse proxy on Pi using pre-built `caddybuilds/caddy-cloudflare` image with DNS-01 for valid Let's Encrypt HTTPS certs
- Wildcard dnsmasq rule (`*.<DOMAIN> → <RPI_IP>`) on both Pi-holes (primary + NAS backup)
- 9 services proxied: Homepage, VaultWarden, Uptime Kuma, Pi-hole, Immich, Jellyfin, Open WebUI, Grafana, Prometheus
- Pi-hole web UI moved from port 80 to 8088 to free port 80 for Caddy
- VaultWarden no longer shows browser security warning (valid HTTPS via `vault.<DOMAIN>`)
- Pi-hole v6 Docker (NAS) required `misc.etc_dnsmasq_d=true` to load custom dnsmasq configs
- ADR-031: Reverse Proxy with Caddy and Split-Horizon DNS

**Nest Thermostat Monitoring (Feb 11)**
- Created `nest-exporter` custom Python exporter on Pi (port 9102)
- Polls Google SDM API every 60s for temperature, humidity, HVAC status, mode, eco, fan, connectivity
- Serves Prometheus metrics at `/metrics`, JSON summary at `/`, health check at `/health`
- Both Celsius and Fahrenheit variants stored in Prometheus
- Prometheus scrape target `nest-thermostat` confirmed UP on NAS
- Grafana "Nest Thermostat" dashboard: stat panels, temperature time series, HVAC state timeline, collapsed 7-day details
- ADR-028: Nest Thermostat Monitoring via Custom Exporter

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
