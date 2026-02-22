# Design Principles

Overarching design principles for the lomavo homelab. See `CLAUDE.md` for a brief summary; this document provides deeper context.

## Homelab Pillars

Six values that guide every decision in this homelab:

1. **Observability** — If you can't see it, you can't fix it. Every service gets monitoring (Homepage widget, Uptime Kuma, Prometheus metrics where applicable). Two-tier dashboards: consolidated for at-a-glance health, detailed for investigation.

2. **Decision Retention** — Document non-obvious decisions as ADRs. Future-you will ask "why did we do it this way?" — the ADR should answer that question. When in doubt, create one.

3. **Phased Work** — Ship something working at each phase. Don't design the perfect system upfront. Each phase builds on the last and delivers usable value independently.

4. **Scalability** — Use abstraction layers, standard protocols (HTTP/JSON), and environment variables so services can be swapped, moved between machines, or replaced without major rewrites (ADR-005).

5. **Transparency** — The repo is the single source of truth. Configs, decisions, and plans are version-controlled. If it's not in the repo, it doesn't exist (for documentation purposes).

6. **Version Control as Fallback** — Everything should be recoverable from the repo. Docker compose files, configs, and documentation live here so any machine can be rebuilt from scratch.

## Core Principles

### 1. Modularity and Swappability (ADR-005)

Design integrations with abstraction layers so services can be swapped without major rewrites.

**In practice:**
- Use environment variables for service URLs/ports (not hardcoded)
- Prefer standard protocols (HTTP APIs, MQTT) over proprietary integrations
- Document interfaces between services, not just implementations
- When adding a new service, consider: "What if we want to replace this later?"

**Examples:**
- Immich jobs proxy uses HTTP API, not Immich-specific libraries
- Glances exposes standard REST API for metrics
- Homepage uses customapi widget type for flexibility

### 2. MCP-Readiness for Future Automation

Structure services and scripts to be actionable via Model Context Protocol (MCP) servers in the future.

**In practice:**
- Expose functionality via HTTP endpoints where possible
- Return structured JSON responses (not HTML or plain text)
- Include metadata in responses (timestamps, status codes)
- Design for both human and machine consumption
- Consider what actions an AI assistant might want to take

**Current MCP-ready services:**
- `metrics-endpoint.ps1` (Gaming PC:61209) - JSON metrics, could support actions
- `immich-jobs-proxy` (Pi:8085) - JSON job counts, could extend to job control
- Glances APIs (all machines:61208) - Standard JSON endpoints
- Immich API - Full REST API with job control

**Future MCP integration points (Phase 3):**
- Query system metrics and health
- Control services (start/stop/restart)
- Trigger Immich jobs (face detection, thumbnail regeneration)
- Search and analyze logs
- Natural language commands via Home Assistant

### 3. HTTP APIs as Integration Layer

Prefer HTTP APIs over shell scripts, file parsing, or proprietary protocols.

**Benefits:**
- Language-agnostic (any client can consume)
- MCP-ready (MCP servers can wrap HTTP APIs easily)
- Testable (curl/Postman for debugging)
- Cacheable and rate-limitable
- Standard authentication patterns (API keys, headers)

**When shell access is still appropriate:**
- One-time setup/deployment tasks
- Operations requiring filesystem access
- Bootstrapping services that will expose HTTP APIs

### 4. Self-Healing and Auto-Recovery

Services should recover from crashes without manual intervention.

**Implementation patterns:**
- Docker: `restart: unless-stopped` or `restart: always`
- Native scripts: Outer restart loop with delay (see `metrics-endpoint.ps1`)
- Scheduled tasks: Configure "Run as soon as possible after missed start"
- Critical services: Consider watchdog processes

### 5. Anonymity for Public Sharing (ADR-018)

The repository should be safe for public sharing without exposing network-specific information.

**In practice:**
- Never hardcode IPs, usernames, or domain names in committed files
- Use placeholders (`<RPI_IP>`, `<GAMING_PC_USER>`, etc.) in documentation
- Use environment variable templating in deployment configs
- Store actual values in gitignored `.env.local` (repo root) or `.env` files (service directories)

**Placeholder conventions:**
| Placeholder | Description |
|-------------|-------------|
| `<RPI_IP>` | Raspberry Pi IP address |
| `<GAMING_PC_IP>` | Gaming PC IP address |
| `<NAS_IP>` | QNAP NAS IP address |
| `<RPI_USER>` | Pi SSH username |
| `<GAMING_PC_USER>` | Gaming PC SSH username |
| `<NAS_USER>` | NAS SSH/SMB username |
| `<DOMAIN>` | Personal domain |
| `<STATUS_URL>` | Public status page URL |
| `<PHOTOS_URL>` | Public photos URL |

**Environment variable templating:**
- Homepage: `{{HOMEPAGE_VAR_*}}` syntax in services.yaml
- Docker Compose: `${VAR}` syntax with `.env` file
- Python/scripts: `os.environ.get("VAR", "default")`

### 6. Observability by Default

Every service should be monitorable.

**Checklist for new services:**
- [ ] Added to Homepage dashboard (visibility)
- [ ] Added to Uptime Kuma (alerting)
- [ ] Exposes health check endpoint (or responds to ping)
- [ ] Logs to stdout/stderr (Docker captures these)

**Two-tier dashboard pattern:**

When adding monitoring for any metric category (temperatures, disk I/O, network, etc.), always design two tiers:

| Tier | Purpose | What to show | Where |
|------|---------|--------------|-------|
| **Consolidated** | At-a-glance health | 2-3 key indicators that answer "is anything wrong?" | Homepage iframes, Grafana top-level panels, alert rules |
| **Full detail** | Investigation & debugging | All available data points for root-cause analysis | Grafana collapsed rows, dedicated drill-down panels |

**How to pick consolidated metrics:** Choose the sensors that (a) your alert rules trigger on and (b) represent worst-case or summary values. If you wouldn't alert on it, it probably belongs in the detail tier only.

**Example — Gaming PC temperatures:**
- *Consolidated:* `CPU_Package` (overall CPU temp, used for throttling decisions) + `GPU_Hot_Spot` (peak GPU temp). These are the 2 sensors the alert rules fire on.
- *Full detail:* All 30 sensors (8 per-core, TjMax distances, unnamed motherboard sensors) in a collapsed "All Temperature Sensors" row. Useful when investigating *why* the consolidated gauge spiked.

**Implementation pattern in Grafana:**
- Consolidated panels live in the main dashboard flow (gauges + timeseries with filtered queries)
- Full-detail panels live in collapsed rows (click to expand, zero visual clutter when closed)
- Homepage iframes point to consolidated panels only

## Technology Selection Guidelines

When choosing technologies, consider:

1. **Existing ecosystem fit** - Does it integrate with what we have?
2. **Maintenance burden** - How complex to update/debug?
3. **Community support** - Active project? Good documentation?
4. **Resource requirements** - Fits on our hardware?
5. **Swappability** - Can we replace it later if needed?

## Related ADRs

| ADR | Principle |
|-----|-----------|
| ADR-005 | Modular and Extensible Architecture |
| ADR-012 | Windows Host Metrics Collection Strategy |
| ADR-016 | System Monitoring Strategy |
| ADR-017 | Immich Jobs Monitoring via Custom Proxy |
| ADR-018 | Sensitive Data Placeholders for Public Sharing |
