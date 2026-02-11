# Future Plans

Phased roadmap for lomavo homelab. See `next-steps.md` for immediate actionable items.

## Phase 1: Network & Storage Foundation - COMPLETE

All Phase 1 work completed January 2025.

- [x] SSH access configured for all machines (Pi, Gaming PC, NAS)
- [x] TrendNet 2.5G switch deployed, all machines hardlinked
- [x] QNAP TS-433 NAS configured with RAID 5 (~9TB usable)
- [x] SMB shares set up (Media, Logs)
- [x] Container Station installed on NAS
- [x] Immich migrated to NAS storage (thumbnails/DB on SSD - ADR-011)
- [x] Docker auto-start on Gaming PC (ADR-015)
- [x] VaultWarden backups on NAS (ADR-013)

## Phase 2: High Availability & Observability - IN PROGRESS

### Monitoring - COMPLETE
- [x] Glances deployed on Pi and NAS
- [x] PowerShell + LibreHardwareMonitor on Gaming PC (ADR-016)
- [x] Homepage widgets for all machines (CPU, RAM, storage, temps)
- [x] Uptime Kuma monitoring all services

### Remaining Phase 2 Work

**Reverse Proxy & HTTPS**
- [ ] Set up reverse proxy for local URLs (e.g., `home.<DOMAIN>`)
  - Note: Xfinity has known difficulties with this
- [ ] Fix HTTPS for VaultWarden (currently shows security warning)
- [ ] Fix Watchtower HTTPS notifications (blocked on reverse proxy)

**DNS Redundancy**
- [x] Deploy secondary Pi-hole on NAS via Container Station
- [x] Configure Keepalived for automatic failover (Virtual IP)
- [x] Set up nebula-sync or gravity-sync for blocklist sync

**Advanced Monitoring**
- [x] Prometheus/Grafana/Loki stack deployed on NAS (ADR-025)
- [x] Discord alerting for critical/warning thresholds (ADR-025)
- [x] Centralized container logs via Loki + Promtail (ADR-025)
- [ ] Add NAS snapshot pool metrics to Homepage (requires SSH/SNMP - ADR-014)
- [ ] Native Glances on Windows (intermediate step - ADR-012)
- [x] Gaming PC Promtail (deployed from console)
- [x] Glances Prometheus exporter (custom Python exporter scraping Glances REST API)

**Power Management**
- [ ] Configure Wake-on-LAN for Gaming PC
- [ ] Create scripts on Pi to wake PC on demand
- [ ] Consider: PC auto-wake for scheduled tasks, auto-sleep when idle

**Misc**
- [x] Display number of active jobs on immich widget (Feb 2025 - ADR-017)

## Phase 3: AI & Automation - IN PROGRESS

### Completed (Phase 3A-3D)
- [x] Deploy Ollama + Open WebUI on Gaming PC (ADR-026)
- [x] Build and deploy all 5 MCP servers on Gaming PC (ADR-027)
  - mcp-homelab (8770), mcp-monitoring (8771), mcp-immich (8772), mcp-dns (8773), mcp-docker (8774)
- [x] Configure Open WebUI native MCP (Streamable HTTP — MCPO proxy not needed)
- [x] Configure Claude Code `.mcp.json` for remote MCP access
- [x] Move Ollama inference to MacBook Air M4 (temporary — Gaming PC CPU too slow)

> Full implementation plan: `.claude/plans/async-moseying-kernighan.md`

### Phase 3E: Polish & Deferred Items

**Cleanup:**
- [ ] Remove MCPO files from Gaming PC (repo clone `gaming-pc\docker\mcpo\` directory)
- [ ] Remove MCPO from repo (`gaming-pc/docker/mcpo/`)
- [ ] Remove MCPO entry from Homepage config
- [ ] **USER ACTION:** Add Uptime Kuma entries for MCP servers (see next-steps.md for URLs)

**Inference improvements:**
- [ ] GPU passthrough for Ollama on Gaming PC (NVIDIA driver upgrade 300s → 470+, or native Windows Ollama install)
- [ ] Model optimization — investigate quantization options (Q4_K_M vs Q5_K_M), smaller capable models, offloading strategies
- [ ] Resolve Ollama permanent hosting (GPU upgrade, dedicated server, or cloud API — MacBook is temporary)

**MCP enhancements:**
- [x] MCP tool call Grafana dashboards (overview + detail) and Homepage widget — data in Loki via structured logging
- [ ] Dedicated SSH key for mcp-docker (currently mounts user's SSH keys; create purpose-specific key pair)
- [ ] RAG ingestion of repo docs into Open WebUI
- [ ] VSCode Copilot MCP configuration
- [ ] Git fetch/pull credentials on Gaming PC + scheduled task to keep repo clone current

**Ollama Prometheus metrics:**
Ollama does not natively expose Prometheus-format metrics. Current monitoring:
- Uptime Kuma HTTP check on `:11434/api/tags` (availability)
- Container logs via Promtail → Loki (errors, model load events)
- Host resource usage via existing metrics-endpoint (CPU/RAM impact of inference)

Options for inference-level metrics (tokens/sec, model load times, request counts):
- [ ] Custom `ollama-exporter` (same pattern as `glances-exporter`): scrape Ollama `/api/ps`
- [ ] Wait for native Ollama Prometheus support (requested upstream)
- [ ] OpenTelemetry integration via Open WebUI

### Home Assistant
- [ ] Set up Home Assistant instance
- [ ] Enable MCP Server integration for LLM access
- [ ] Thermostat monitoring (ZWave connector)

### Custom Wrapper App
- [ ] Flutter app using mcp_client package
- [ ] Unified interface to all homelab services via MCP
- [ ] LLM integration for natural language commands

### Immich Enhancements
- [ ] Consider: Move Immich "brain" to NAS, only wake PC for transcoding
- [ ] Set up locally hosted map tiles (replace tiles.immich.cloud)
- [ ] LLM integration for batch metadata updates

## Phase 4: Kubernetes (Long-term)

- [ ] Initialize K3s cluster (Pi as control plane, NAS/PC as workers)
- [ ] QNAP Container Station has built-in K3s support
- [ ] NAS as Persistent Volume provider via NFS
- [ ] Migrate services incrementally: VaultWarden, Homepage, custom apps

## Ideas to Research

- [ ] Organizr as alternative to Homepage (has SSO)
- [ ] Vector store for searching previous decisions/documentation
- [ ] SSH aliases for quick access to Pi/PC from MacBook
- [ ] Immich architecture: PC vs NAS as primary for uptime

## Backlog / Cleanup

- [ ] Investigate pc_storage mount on Pi (`/home/<RPI_USER>/pc_storage`)
  - Contains Immich encoded videos (~626GB)
  - Unclear if actively used or experimental
  - Determine if this should migrate to NAS or be removed

---

## Notes

- All new services should be added to Homepage dashboard
- All monitorable services should have Uptime Kuma entries
- Document decisions in ADR format as they're made
- Gaming PC has 32GB RAM - capable worker node
