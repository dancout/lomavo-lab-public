# Next Steps

See `plans/README.md` for detailed topic files, `completed.md` for history.

## Current Sprint

_Pick a task from below and move it here with `/next-task`._

## Priority 1 — Quick Wins

~1 session each, no blockers.

- [ ] Configure Wake-on-LAN for Gaming PC
- [ ] Set up SSH aliases for quick machine access from MacBook
- [ ] Add Uptime Kuma entries for MCP servers
- [ ] Audit Xfinity router open ports (check if still needed, close if not)
- [ ] Immich: set up self-hosted map tiles (replace tiles.immich.cloud)
- [ ] Add `NEST_USER` to `.env` / `.env.example`
- [ ] Investigate pc_storage mount on Pi (cleanup or migrate ~626GB encoded videos)

## Priority 2 — Medium Effort, High Payoff

~1–3 sessions each.

- [ ] Align Uptime Kuma monitors with Grafana alerts (single source of truth for service health)
- [ ] Watchtower update notifications (Discord alert when container images auto-update)
- [ ] NAS snapshot pool metrics on Homepage (requires SSH/SNMP — ADR-014)
- [ ] Dedicated SSH key for mcp-docker container (replace mounted user keys)
- [ ] MCP vector search for ADRs via Qdrant (local LLM search saves Claude API credits)
- [ ] RAG ingestion of repo docs into Open WebUI (ADR-033)
- [ ] Git fetch/pull scheduled task for Gaming PC repo clone
- [ ] MCP tool call Grafana dashboard (authorized vs unauthorized breakdown + Discord alert)
- [ ] Verify Vaultwarden backup accessibility when Pi is down (write recovery instructions)
- [ ] Custom ollama-exporter (Prometheus metrics via `/api/ps`, same pattern as glances-exporter)
- [ ] Native Glances on Windows for richer host metrics (ADR-012)

## Priority 3 — Larger Features

Multi-session, may need user action or decisions.

- [ ] Set up Home Assistant + MCP integration (thermostat monitoring via ZWave)
- [ ] Immich token audit and consolidation (explicit permissions per token, documented for new users)
- [ ] Immich LLM batch metadata updates
- [ ] Immich architecture: consider moving brain to NAS (uptime vs GPU tradeoffs)
- [ ] VSCode Copilot MCP configuration
- [ ] Fix Gaming PC Docker credsStore issue (enable autonomous agent commands)

## Priority 4 — Deferred / Hardware-Dependent

Blocked on hardware, major infrastructure changes, or upstream fixes.

- [ ] Power consumption tracking (needs smart plug hardware — e.g., TP-Link Kasa KP115)
- [ ] Xfinity bridge mode + own router (network overhaul, fixes IPv6 RA DNS conflict — ADR-031)
- [ ] At-rest encryption (BitLocker for Gaming PC, QNAP volume encryption for documents)
- [ ] GPU passthrough / Ollama permanent hosting (NVIDIA driver upgrade or dedicated server)
- [ ] Cross-encoder reranking for document search (Python 3.14 / Infinity compatibility blocker)
- [ ] Flutter wrapper app (unified homelab interface via MCP)
- [ ] Security hardening for exposed values in git history (ADR-018)

## Learning Projects

Educational value, not operationally needed.

- [ ] K3s cluster — learn Kubernetes using existing machines (Docker Compose stays primary). See `plans/phase4-kubernetes.md` for details.
