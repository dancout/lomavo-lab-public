# lomavo-lab

A personal homelab built almost entirely through AI-assisted development using [Claude Code](https://docs.anthropic.com/en/docs/claude-code). From bare hardware to a fully observable, highly available multi-machine infrastructure — designed, deployed, debugged, and documented in collaboration with an AI coding agent.

## About This Project

This homelab serves as both a deployed reference and a reusable template. It was built by a senior software developer (10 years: Angular, Python, Node, Flutter) who was new to infrastructure and homelabbing, using [Claude Code](https://docs.anthropic.com/en/docs/claude-code) as the primary development tool. The configs, scripts, and ADRs are parameterized and adaptable — nothing is hardcoded to one person's setup.

Every service runs on real hardware across three machines. The project hit real platform bugs along the way (QNAP's BusyBox quirks, Windows SSH edge cases, ARM Docker limitations), each requiring actual debugging and workarounds. 36 architecture decision records document the tradeoffs and reasoning behind each non-obvious choice.

> **Using this as a starting point?** See [GETTING_STARTED.md](GETTING_STARTED.md) to initialize it for your own setup — archive the original owner's state, fill in your hardware profile, and start building.

## Architecture Overview

```
                    ┌─────────────────────────────────────────┐
                    │              MacBook Air M4             │
                    │  Claude Code (AI dev environment)       │
                    │  Ollama LLM inference (temporary)       │
                    └──────────────────┬──────────────────────┘
                                       │
                         ┌─────────────┴─────────────┐
                         │   TrendNet 2.5G Switch    │
                         └──┬───────────┬─────────┬──┘
                            │           │         │
              ┌-────────────┴┐   ┌──────┴──────┐  ├──────────────┐
              │ Raspberry Pi │   │  Gaming PC  │  │  QNAP NAS    │
              │              │   │             │  │  TS-433      │
              │ Pi-hole (DNS)│   │ Immich      │  │              │
              │ WireGuard VPN│   │ Jellyfin    │  │ Pi-hole      │
              │ Caddy (HTTPS)│   │ Open WebUI  │  │  (backup)    │
              │ Homepage     │   │ Paperless   │  │ Prometheus   │
              │ Uptime Kuma  │   │ Qdrant      │  │ Grafana      │
              │ VaultWarden  │   │ MCP servers │  │ Loki         │
              │ Nest Exporter│   │ Glances     │  │ Keepalived   │
              │ Promtail     │   │ Promtail    │  │  (BACKUP)    │
              │ Keepalived   │   │             │  │              │
              │  (MASTER)    │   │             │  │              │
              └──────────────┘   └─────────────┘  └──────────────┘
                         │                                │
                         └──── VIP (shared DNS) ──────────┘
                              Automatic failover via VRRP
```

**4 machines, 45+ services, zero manual intervention required after deployment.**

## Key Technical Work

### Custom MCP Servers (TypeScript)
6 [Model Context Protocol](https://modelcontextprotocol.io/) servers allow both Claude Code and a local Open WebUI chat interface to query and control the homelab programmatically:

| Server | Purpose |
|--------|---------|
| `mcp-homelab` | Search repo docs, read files, query service inventory |
| `mcp-monitoring` | Run PromQL queries, search Loki logs, check Grafana alerts |
| `mcp-immich` | Search photos, manage albums, control ML jobs |
| `mcp-dns` | Pi-hole stats, toggle blocking, inspect query logs |
| `mcp-docker` | Manage containers across all 3 machines via SSH |
| `mcp-documents` | Semantic search over personal documents (Paperless-ngx + Qdrant) |

All servers use Streamable HTTP transport, share a common TypeScript factory pattern, and are deployed as Docker containers on the Gaming PC. The document search server combines Paperless-ngx for OCR/storage with Qdrant for vector and BM25 hybrid search.

### DNS High Availability
Pi-hole primary on the Pi with an auto-synced backup on the NAS. Keepalived VRRP floats a virtual IP between them — if the Pi goes down, DNS fails over to the NAS in ~5 seconds. Devices never need reconfiguration because DHCP advertises the VIP.

### Full Observability Stack
- **Prometheus** scrapes metrics from all machines (including a custom Python exporter that bridges Glances' REST API to Prometheus format, and a PowerShell endpoint for Windows hardware metrics via LibreHardwareMonitor)
- **Grafana** dashboards with Discord alerting for critical thresholds
- **Loki + Promtail** for centralized container logs across all 3 machines
- **Homepage** dashboard as the single pane of glass
- **Uptime Kuma** for availability monitoring with a public status page

### Platform-Specific Problem Solving
Running Docker across Linux, Windows, and QNAP's BusyBox environment surfaced a number of platform-specific issues. Each is documented in its own ADR:
- QNAP NAS can't build Docker images (`permission denied`) — images are cross-built on the Pi (same aarch64 arch) and transferred via `docker save/load`
- QNAP has no `sysctl.conf` — sysctls are applied at boot via a privileged init container using `nsenter`
- Windows SSH sessions can't access mapped drives — Docker CIFS volumes with inline credentials instead
- Pi-hole v6's API session limit (16) gets exhausted by multiple integrations — resolved by raising the limit
- Glances' Prometheus export mode is incompatible with its web server mode — a custom Python sidecar exporter bridges the gap
- Caddy can't build from source on the Pi (1GB RAM limit) — uses a pre-built Docker image instead

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Languages** | TypeScript, Python, PowerShell, Bash |
| **Containers** | Docker, Docker Compose (across Linux, Windows, QNAP) |
| **DNS** | Pi-hole v6, Keepalived (VRRP), nebula-sync |
| **Monitoring** | Prometheus, Grafana, Loki, Promtail, Uptime Kuma, Glances |
| **Networking** | WireGuard VPN, Tailscale, Cloudflare Tunnels, Caddy (reverse proxy) |
| **AI/LLM** | Ollama, Open WebUI, MCP (Model Context Protocol), Qdrant (vector DB) |
| **Media** | Immich (photos), Jellyfin (media server) |
| **Documents** | Paperless-ngx (OCR/management), Qdrant (semantic search) |
| **Security** | VaultWarden (Bitwarden-compatible), SSH key auth |
| **AI Tooling** | Claude Code (primary development tool) |

## Repository Structure

```
├── CLAUDE.md              # AI assistant instructions and project context
├── GETTING_STARTED.md     # Onboarding guide for new users / forkers
├── archive/               # Original owner's state (populated by setup script)
├── scripts/               # Utility scripts (new-user-setup.sh)
├── decisions/             # 36 Architecture Decision Records
├── infrastructure/        # Network topology, service inventory
├── plans/                 # Phased roadmap with topic files
├── runbooks/              # Incident response and diagnosis procedures
├── rpi/                   # Raspberry Pi configs and Docker Compose files
├── gaming-pc/             # Gaming PC configs, scripts, Docker Compose files
├── nas/                   # QNAP NAS configs and Docker Compose files
├── macbook/               # MacBook setup (temporary Ollama host)
├── mcp-servers/           # TypeScript MCP server source code
└── reference/             # Design principles, research notes
```

## Development Process

Claude Code had direct SSH access to all machines. The typical workflow: the developer described what needed to happen, the agent researched options and proposed an approach, the developer approved or redirected, and the agent wrote configs, deployed them, and verified health — all within the same conversation.

What the agent handled:
- **Architecture decisions**: Researching options, evaluating tradeoffs, drafting ADRs for developer review
- **Configuration authoring**: Docker Compose files, Prometheus scrape configs, Grafana dashboards, alerting rules
- **Custom software**: MCP servers (TypeScript), Glances exporters (Python), metrics endpoints (PowerShell)
- **Deployment**: SCP configs to machines, SSH in, bring services up, verify health
- **Debugging**: Diagnosing platform-specific issues across Linux, Windows, and QNAP's BusyBox environment
- **Documentation**: Maintaining living docs that stay in sync with the actual infrastructure

Every architectural decision is logged in the [`decisions/`](decisions/) directory — 36 ADRs capturing the problem context, alternatives considered, and rationale for the chosen approach.

## Status

**Phase 1 (Network & Storage)**: Complete
**Phase 2 (HA & Observability)**: ~95% complete (WoL remaining)
**Phase 3 (AI & Automation)**: In progress (MCP servers, document search with Paperless-ngx deployed; GPU inference and Home Assistant next)
**Phase 4 (Kubernetes)**: Planned

See [`plans/README.md`](plans/README.md) for the full roadmap.
