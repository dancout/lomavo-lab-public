# Services Inventory

Read this file when working with specific services, adding new services, or troubleshooting.

**Note:** IPs use placeholders. See `.env.local` for actual values.

## Raspberry Pi (`<RPI_IP>`)

| Service | Port | Docker | Notes |
|---------|------|--------|-------|
| Pi-hole | 80, 53 | No (native) | DNS server, DHCP disabled |
| WireGuard VPN | 51820 | No (native) | Phone auto-connects off-network |
| Keepalived | - | No (native) | VRRP MASTER for Pi-hole HA VIP (<VIP>) |
| Uptime Kuma | 3001 | Yes | <STATUS_URL> via Cloudflare tunnel |
| VaultWarden | 8080 | Yes | Password manager |
| Homepage | 3000 | Yes | Dashboard |
| Glances | 61208 | Yes | System metrics, Homepage widget (ADR-016) |
| immich-jobs-proxy | 8085 | Yes | Aggregates Immich job counts for Homepage widget |
| Watchtower | - | Yes | Auto-updates containers |
| Cloudflare Tunnel | - | Yes | Exposes Uptime Kuma |
| glances-exporter | 9101 | Yes | Exports Glances metrics in Prometheus format |
| Promtail | 9080 | Yes | Ships Pi Docker logs to Loki on NAS (ADR-025) |

Config location: `/home/<RPI_USER>/<service>/`
Repo location: `rpi/docker/<service>/`

## Gaming PC (`<GAMING_PC_IP>`)

| Service | Port | Docker | Notes |
|---------|------|--------|-------|
| Immich | 2283 | Yes | Photo backup, <PHOTOS_URL> via Tailscale |
| Jellyfin | 8096 | Yes | Media server |
| Glances | 61208 | Yes | Container metrics, Homepage widget |
| metrics-endpoint | 61209 | No (PowerShell) | Windows host metrics (CPU/RAM/disk), ADR-012 |
| Promtail | 9080 | Yes | Ships Gaming PC Docker logs to Loki on NAS (ADR-025) |
| Open WebUI | 3080 | Yes | Chat interface, connects to Ollama on MacBook (ADR-026) |
| mcp-homelab | 8770 | Yes | MCP server: repo/docs access (ADR-027) |
| mcp-monitoring | 8771 | Yes | MCP server: Prometheus/Grafana/Loki queries (ADR-027) |
| mcp-immich | 8772 | Yes | MCP server: photo search, albums, job control (ADR-027) |
| mcp-dns | 8773 | Yes | MCP server: Pi-hole stats, blocking, query log (ADR-027) |
| mcp-docker | 8774 | Yes | MCP server: container management across all machines (ADR-027) |
| MCPO | 8766 | Stopped | Not needed — Open WebUI has native MCP support (cleanup in 3E) |
| Watchtower | - | Stopped | Config exists, not running - manual updates preferred |

Config locations:
- Immich: `C:\Server_Data\Docker\immich\` (SSD, ADR-011)
- Jellyfin: `D:\Server_Data\Docker\jellyfin\` (HDD)
- MCP servers: built from `mcp-servers/` in repo clone
Repo location: `gaming-pc/docker/<service>/`

**Hardware acceleration:**
- GPU: GTX 1050Ti (NVENC transcoding)
- Immich ML and Jellyfin use GPU

## QNAP NAS (`<NAS_IP>`)

| Service | Port | Docker | Notes |
|---------|------|--------|-------|
| QTS Web UI | 8080 | No | Admin interface |
| SMB/CIFS | 445 | No | File sharing |
| Pi-hole (backup) | 53, 8089 | Yes | Backup DNS, synced from primary via nebula-sync |
| nebula-sync | - | Yes | Syncs Pi-hole config from Pi every 2 hours |
| Keepalived | - | Yes (host networking) | VRRP BACKUP for Pi-hole HA VIP (<VIP>) |
| Glances | 61208 | Yes | System monitor, Homepage widget |
| glances-exporter | 9101 | Yes | Exports Glances metrics in Prometheus format |
| Prometheus | 9090 | Yes | Time-series metrics storage & scraping (ADR-025) |
| Grafana | 3030 | Yes | Dashboards, alerting (Discord), log viewer (ADR-025) |
| Loki | 3100 | Yes | Log aggregation, 30-day retention (ADR-025) |
| Promtail | 9080 | Yes | Ships NAS Docker logs to Loki |

Config location: `/share/CACHEDEV1_DATA/docker/<service>/`
Docker command: `DOCKER_HOST=unix:///var/run/system-docker.sock docker compose ...`
Docker binary: `/share/CACHEDEV1_DATA/.qpkg/container-station/bin/docker`

Storage: RAID 5, 3x4TB, ~5.8TB usable
Shares: Backups, Media, Logs

## MacBook Air (`<MACBOOK_IP>`) — Temporary

> Temporary LLM inference host. See `macbook/README.md` for details.

| Service | Port | Install Method | Notes |
|---------|------|---------------|-------|
| Ollama | 11434 | Homebrew | LLM inference via M4 Neural Engine (ADR-026) |

**OLLAMA_HOST=0.0.0.0** must be set via `launchctl setenv` for LAN access.
**brew services start ollama** is active — auto-starts on login. Stop when migrating off.

## External Services

| Service | URL | Backend |
|---------|-----|---------|
| <STATUS_URL> | Cloudflare Tunnel | Uptime Kuma on Pi |
| <PHOTOS_URL> | Tailscale + DO VPS | Immich on Gaming PC |

## Service Dependencies

```
Phone backups → WireGuard VPN → Immich (Gaming PC)
                    or
              → Tailscale → <PHOTOS_URL> → Immich

All devices → Pi-hole VIP (<VIP>) → Keepalived →
              MASTER: Pi-hole on Pi (<RPI_IP>)
              BACKUP: Pi-hole on NAS (<NAS_IP>)
              nebula-sync: Primary Pi-hole (Pi) → Backup Pi-hole (NAS)

Watchtower notifications → Uptime Kuma (Pi, port 3001)

Open WebUI (Gaming PC) → Ollama (MacBook:11434) [TEMPORARY — MacBook must be awake]
Open WebUI (Gaming PC) → MCP servers (native Streamable HTTP, no proxy needed)

Claude Code (MacBook) → mcp-homelab (Gaming PC:8770) → repo clone
Claude Code (MacBook) → mcp-monitoring (Gaming PC:8771) → Prometheus/Grafana/Loki (NAS)
Claude Code (MacBook) → mcp-immich (Gaming PC:8772) → Immich API (Gaming PC:2283)
Claude Code (MacBook) → mcp-dns (Gaming PC:8773) → Pi-hole (Pi + NAS)
Claude Code (MacBook) → mcp-docker (Gaming PC:8774) → Docker (all machines via socket + SSH)
```

## Adding New Services

1. Add to Homepage dashboard (`rpi/docker/homepage/`)
2. Add to Uptime Kuma monitoring
3. Document in machine-specific README
4. Update this file
