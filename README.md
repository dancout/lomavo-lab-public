# lomavo-lab

A personal homelab built almost entirely through AI-assisted development using [Claude Code](https://docs.anthropic.com/en/docs/claude-code). From bare hardware to a fully observable, highly available multi-machine infrastructure — designed, deployed, debugged, and documented in collaboration with an AI coding agent.

## About This Project

This homelab was built by a senior software developer (10 years: Angular, Python, Node, Flutter) who was new to infrastructure and homelabbing. Claude Code served as the primary development tool — researching options, writing configurations, diagnosing platform-specific issues, and proposing architectural decisions. The developer directed the architecture and made final calls on what to build; the agent handled the implementation legwork.

Every service runs on real hardware across three machines. The project hit real platform bugs along the way (QNAP's BusyBox quirks, Windows SSH edge cases, ARM Docker limitations), each requiring actual debugging and workarounds. 27 architecture decision records document the tradeoffs and reasoning behind each non-obvious choice.

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
              │ Homepage     │   │ Open WebUI  │  │  (backup)    │
              │ Uptime Kuma  │   │ MCP servers │  │ Prometheus   │
              │ VaultWarden  │   │ Glances     │  │ Grafana      │
              │ Promtail     │   │ Promtail    │  │ Loki         │
              │ Keepalived   │   │             │  │ Keepalived   │
              │  (MASTER)    │   │             │  │  (BACKUP)    │
              └──────────────┘   └─────────────┘  └──────────────┘
                         │                                │
                         └──── VIP (shared DNS) ──────────┘
                              Automatic failover via VRRP
```

**4 machines, 30+ services, zero manual intervention required after deployment.**

## Key Technical Work

### Custom MCP Servers (TypeScript)
5 [Model Context Protocol](https://modelcontextprotocol.io/) servers allow both Claude Code and a local Open WebUI chat interface to query and control the homelab programmatically:

| Server | Purpose |
|--------|---------|
| `mcp-homelab` | Search repo docs, read files, query service inventory |
| `mcp-monitoring` | Run PromQL queries, search Loki logs, check Grafana alerts |
| `mcp-immich` | Search photos, manage albums, control ML jobs |
| `mcp-dns` | Pi-hole stats, toggle blocking, inspect query logs |
| `mcp-docker` | Manage containers across all 3 machines via SSH |

All servers use Streamable HTTP transport, share a common TypeScript factory pattern, and are deployed as Docker containers on the Gaming PC.

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

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Languages** | TypeScript, Python, PowerShell, Bash |
| **Containers** | Docker, Docker Compose (across Linux, Windows, QNAP) |
| **DNS** | Pi-hole v6, Keepalived (VRRP), nebula-sync |
| **Monitoring** | Prometheus, Grafana, Loki, Promtail, Uptime Kuma, Glances |
| **Networking** | WireGuard VPN, Tailscale, Cloudflare Tunnels |
| **AI/LLM** | Ollama, Open WebUI, MCP (Model Context Protocol) |
| **Media** | Immich (photos), Jellyfin (media server) |
| **Security** | VaultWarden (Bitwarden-compatible), SSH key auth |
| **AI Tooling** | Claude Code (primary development tool) |

## Repository Structure

```
├── CLAUDE.md              # AI assistant instructions and project context
├── decisions/             # 27 Architecture Decision Records
├── infrastructure/        # Network topology, service inventory
├── rpi/                   # Raspberry Pi configs and Docker Compose files
├── gaming-pc/             # Gaming PC configs, scripts, Docker Compose files
├── nas/                   # QNAP NAS configs and Docker Compose files
├── macbook/               # MacBook setup (temporary Ollama host)
├── mcp-servers/           # TypeScript MCP server source code
├── runbooks/              # Incident response procedures
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

Every architectural decision is logged in the [`decisions/`](decisions/) directory — 27 ADRs capturing the problem context, alternatives considered, and rationale for the chosen approach.

## Status

**Phase 1 (Network & Storage)**: Complete
**Phase 2 (HA & Observability)**: ~90% complete (reverse proxy and WoL remaining)
**Phase 3 (AI & Automation)**: In progress (MCP servers deployed, GPU inference and Home Assistant next)
**Phase 4 (Kubernetes)**: Planned

See [`plans/README.md`](plans/README.md) for the full roadmap.
