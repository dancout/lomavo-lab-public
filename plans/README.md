# Future Plans

Phased roadmap for lomavo homelab. **`next-steps.md` is the prioritized execution queue** — use it to pick work via `/next-task`. Topic files below contain detailed context for when tasks are picked up. See `completed.md` for history.

## Phase Overview

| Phase | Status | Summary |
|-------|--------|---------|
| 1: Network & Storage | **Complete** | SSH, 2.5G switch, NAS RAID 5, Immich migration, Docker auto-start |
| 2: HA & Observability | In Progress | DNS failover done; monitoring, power mgmt, dashboard items remain |
| 3: AI & Automation | In Progress | Ollama + MCP deployed; polish, document search, apps remain |
| 4: Kubernetes | Future | K3s cluster, service migration |

## Topic Files

| File | Items | Area |
|------|-------|------|
| [homepage-dashboard.md](homepage-dashboard.md) | 5 | Homepage widgets, storage trends, alerts display |
| [monitoring.md](monitoring.md) | 10 | Metrics, alerting, Ollama Prometheus, dashboards |
| [mcp-enhancements.md](mcp-enhancements.md) | 18 | MCP servers, document search, MCPO cleanup |
| [infrastructure.md](infrastructure.md) | 9 | Xfinity bridge, WoL, security hardening |
| [ai-and-apps.md](ai-and-apps.md) | 12 | GPU passthrough, Home Assistant, Flutter app, Immich |
| [phase4-kubernetes.md](phase4-kubernetes.md) | 4 | K3s cluster, NFS volumes, service migration |
| [ideas-and-backlog.md](ideas-and-backlog.md) | 6 | Research ideas, cleanup tasks |

---

All new services should be added to Homepage dashboard, Uptime Kuma, and documented in ADR format.
