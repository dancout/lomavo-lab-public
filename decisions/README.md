# Architecture Decision Records

This directory contains Architecture Decision Records (ADRs) documenting significant decisions made during homelab development.

## Quick Reference

| ID | Title | Keywords | Summary |
|----|-------|----------|---------|
| ADR-001 | SSH Key Authentication for Pi | ssh, security, automation | Use SSH keys instead of passwords for Pi access to enable Claude Code automation |
| ADR-002 | Environment Variables for Docker Secrets | docker, security, secrets | Store sensitive values in .env files, reference via ${VAR} in docker-compose |
| ADR-003 | Machine-Specific Directory Structure | organization, deployment | Separate directories per machine (rpi/, gaming-pc/) with local .env.example templates |
| ADR-004 | Version Control Deployment Workflow | git, deployment, docker | Canonical configs in repo, scp to machines, .env files stay on target machines |
| ADR-005 | Modular and Extensible Architecture | architecture, modularity, interfaces, future-proofing | Design integrations with abstraction layers so services can be swapped without major rewrites |
| ADR-006 | Windows OpenSSH Setup for Gaming PC | ssh, windows, gaming-pc, authentication | OpenSSH Server with admin authorized_keys path for SSH key auth |
| ADR-007 | Intentional Watchtower Config Mismatch | watchtower, gaming-pc, config, deferred | **Superseded** — Watchtower reactivated with HTTPS push via Caddy (ADR-031) |
| ADR-008 | NAS Storage Configuration | nas, raid5, storage, logs | RAID 5 for all storage including logs; thick volume; 20% snapshot space |
| ADR-009 | Immich NAS Storage Architecture | immich, nas, docker, cifs, storage | Docker CIFS volumes for NAS access; hybrid storage with thumbnails local |
| ADR-010 | Homepage Services Configuration Templating | homepage, templating, secrets, config | Track services.yaml in git using {{HOMEPAGE_VAR_*}} templating with env_file directive |
| ADR-011 | Immich SSD Consolidation | immich, ssd, performance, gaming-pc | All Immich data (DB, thumbs, config) consolidated to C: drive SSD for performance and simplicity |
| ADR-012 | Windows Host Metrics Collection Strategy | monitoring, powershell, metrics, gaming-pc | Custom PowerShell endpoint for host metrics; future path to native Glances then Prometheus |
| ADR-013 | VaultWarden Backups on NAS | vaultwarden, backups, nas, raid5 | Move VaultWarden backups from Gaming PC to NAS for RAID 5 protection and always-on availability |
| ADR-014 | NAS Storage Widget Metrics | nas, homepage, glances, monitoring | CustomAPI widget for volume metrics; snapshot pool requires SSH/SNMP (deferred) |
| ADR-015 | Windows Auto-Login for Docker Desktop | windows, docker, auto-login, gaming-pc | Auto-login with screen lock so Docker Desktop starts at boot without manual intervention |
| ADR-016 | System Monitoring Strategy | monitoring, glances, temperature, network | Hybrid approach: Glances for Linux systems, PowerShell+LibreHardwareMonitor for Windows |
| ADR-017 | Immich Jobs Monitoring via Custom Proxy | immich, monitoring, homepage, proxy | Custom proxy aggregates Immich job queue counts since Homepage widget doesn't support jobs |
| ADR-018 | Sensitive Data Placeholders for Public Sharing | security, git, config, placeholders | Replace hardcoded IPs/usernames/domains with placeholders; actual values in gitignored .env.local |
| ADR-019 | Network Stats via .NET NetworkInterface API | network, tailscale, monitoring, gaming-pc | Use .NET API for network stats since Tailscale doesn't appear in WMI performance counters |
| ADR-020 | MacBook Photo Migration and LHM Auto-Recovery | immich, photos, migration, gaming-pc, monitoring | Bulk upload MacBook photos via Immich CLI with NTFS staging for USB drives; LHM scheduled task restart-on-failure policy |
| ADR-021 | Backup Pi-hole on QNAP NAS | pihole, nas, dns, nebula-sync, docker | Backup Pi-hole on NAS with nebula-sync; bind to NAS IP only for port 53 conflict; FULL_SYNC=false for env-var-locked settings |
| ADR-022 | Keepalived HA for Pi-hole DNS Failover | keepalived, pihole, ha, vrrp, nas | VIP (`<VIP>`) floats between Pi (MASTER) and NAS (BACKUP) for automatic DNS failover in ~5s |
| ADR-023 | Pi-hole DHCP with VIP Advertisement | pihole, dhcp, xfinity, vip, dnsmasq | Pi-hole DHCP (10-100) alongside Xfinity (150-151) since Xfinity can't disable DHCP or change DNS; advertises VIP via dnsmasq option; DHCP HA deferred |
| ADR-024 | Homepage Pi-hole Widgets and Cloud Services | homepage, pihole, cloudflare, digitalocean, widgets | Pi-hole v6 stats widgets require app passwords (not web password); Cloud Services section for Cloudflare/DigitalOcean quick access |
| ADR-025 | Prometheus + Grafana + Loki Monitoring Stack | prometheus, grafana, loki, monitoring, alerting, nas | Historical metrics, Discord alerting, centralized logs on NAS; Prometheus scrapes metrics-endpoint and immich-jobs-proxy; Grafana dashboards + alert rules |
| ADR-026 | Ollama Local LLM Deployment on Gaming PC | ollama, llm, open-webui, gaming-pc | CPU-only Ollama with Qwen 2.5 7B models; Open WebUI chat interface; GPU deferred to Phase 3E |
| ADR-027 | MCP Server Architecture for Homelab Integration | mcp, typescript, llm, automation | Per-domain MCP servers on Gaming PC via Streamable HTTP; TypeScript + express; Claude Code and Open WebUI as clients |
| ADR-028 | Nest Thermostat Monitoring via Custom Exporter | nest, thermostat, prometheus, sdm-api, monitoring | Custom Python exporter on Pi polls Google SDM API; serves Prometheus metrics at port 9102 |
| ADR-029 | New Service Deployment Checklist | process, checklist, observability, documentation | Consolidated checklist in CONTRIBUTING.md for adding services; covers prerequisites, Homepage, Uptime Kuma, alerting |
| ADR-030 | Grafana Dashboard File Provisioning | grafana, dashboards, provisioning, version-control | All 6 dashboards exported to JSON and file-provisioned; read-only in UI, changes via repo |
| ADR-031 | Reverse Proxy with Caddy and Split-Horizon DNS | caddy, reverse-proxy, https, dns, cloudflare | Caddy on Pi with Cloudflare DNS-01 for HTTPS; wildcard dnsmasq on both Pi-holes; LAN-only friendly URLs |
| ADR-032 | Pre-built Caddy Docker Image Over Building from Source | caddy, docker, arm, build | Use `caddybuilds/caddy-cloudflare` pre-built image; xcaddy build infeasible on Pi's 1GB RAM |
| ADR-033 | Document Storage and Semantic Search Architecture | paperless, qdrant, mcp, documents, privacy | Paperless-ngx + Qdrant + mcp-documents for semantic search over personal docs; self-hosted LLM only, not exposed to Claude Code |
| ADR-034 | Hybrid Search with BM25 and Cross-Encoder Reranking | qdrant, bm25, hybrid-search, reranking, infinity | Qdrant built-in BM25 sparse vectors + RRF fusion for keyword+semantic search; optional Infinity cross-encoder reranking on MacBook |
| ADR-035 | Document Search Improvements for LLM Usability | mcp, documents, search, tags, llm | Default source_type to 'document', graceful tag validation, filename in BM25 + results, list_tags tool, LLM-guiding descriptions |
| ADR-036 | Prometheus Config Variable Substitution | prometheus, secrets, envsubst, deploy | Mac-side envsubst deploy script resolves ${VAR} placeholders in prometheus.yml before SCP to NAS |
| ADR-037 | Environment Variable Standardization | env, config, standardization, best-practices | Standardize on `.env` (not `.env.local`) as template and local config filename; aligns with industry conventions |

## Format

Each ADR follows this structure:
- **Status**: Proposed / Accepted / Deprecated / Superseded
- **Context**: What prompted this decision
- **Decision**: What we decided
- **Consequences**: Trade-offs and implications
