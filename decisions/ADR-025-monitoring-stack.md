# ADR-025: Prometheus + Grafana + Loki Monitoring Stack

**Status:** Accepted
**Date:** 2026-02-06

## Context

Services have gone down (e.g., Gaming PC temperature monitoring) without being noticed for extended periods. Current monitoring is real-time only — Glances, Homepage, and the PowerShell metrics-endpoint show live data but store nothing. Uptime Kuma monitors endpoint availability but not metric thresholds (CPU, temp, disk). There's no way to answer "how long was it down?" or "what happened before it crashed?" — and no proactive alerts for metric anomalies.

## Decision

Deploy a Prometheus + Grafana + Loki stack on the QNAP NAS for historical metrics, alerting, and centralized log viewing.

### Stack Components

| Component | Role | Port | Host |
|-----------|------|------|------|
| Prometheus | Time-series metrics scraping & storage | 9090 | NAS |
| Grafana | Dashboards, alerting, log viewer | 3030 | NAS |
| Loki | Log aggregation | 3100 | NAS |
| Promtail | Log shipper (NAS containers) | 9080 | NAS |
| Promtail | Log shipper (Pi containers) | 9080 | Pi |
| Promtail | Log shipper (Gaming PC containers) | 9080 | Gaming PC |
| glances-exporter | Glances → Prometheus adapter (Pi) | 9101 | Pi |
| glances-exporter | Glances → Prometheus adapter (NAS) | 9101 | NAS |

### Why NAS

- **Not Pi:** Only ~285MB RAM free — adding 400-600MB would OOM
- **Not Gaming PC:** Not always-on — monitoring must detect when other things go down
- **NAS works:** Always-on, 4GB RAM with ~2-3GB free, RAID 5 storage for durability

### Metrics Sources

Prometheus scrapes four custom endpoints that serve Prometheus text format:

| Target | Port | Metrics |
|--------|------|---------|
| metrics-endpoint (Gaming PC) | 61209/metrics | Windows CPU, RAM, disk, temps, network |
| immich-jobs-proxy (Pi) | 8085/metrics | Per-queue Immich job counts (active, waiting, failed) |
| glances-exporter (Pi) | 9101/metrics | Pi CPU, RAM, disk, load, temps, network |
| glances-exporter (NAS) | 9101/metrics | NAS CPU, RAM, disk, load, temps, network |

**Glances Note:** Glances' `--export prometheus` flag is incompatible with `-w` (webserver mode). Custom `glances-exporter` containers scrape the Glances REST API (`/api/4/`) and serve Prometheus-format metrics at `:9101/metrics`. Glances web UI continues running at `:61208` for Homepage widgets.

### Grafana Dashboards

| Dashboard | Purpose |
|-----------|---------|
| Homelab Overview | Gauges + time series for all 3 machines (CPU, RAM, disk, temps, load, network) |
| Immich Jobs & Hardware | Per-queue job counts + Gaming PC hardware during Immich processing |
| Container Logs | Loki log viewer with machine/container filtering (all 3 machines) |

### Alert Rules (via Grafana)

| Alert | Scope | Condition | Severity |
|-------|-------|-----------|----------|
| Scrape Target Down | All | Target unreachable for >2 min | Critical |
| High CPU Usage (Gaming PC) | Gaming PC | CPU > 90% for >5 min | Warning |
| High RAM Usage (Gaming PC) | Gaming PC | RAM > 90% for >5 min | Warning |
| Disk Almost Full (Gaming PC) | Gaming PC | Disk > 85% for >5 min | Warning |
| High Temperature (Gaming PC) | Gaming PC | CPU/GPU > 80°C for >2 min | Critical |
| High CPU Usage (Pi/NAS) | Pi + NAS | CPU > 90% for >5 min | Warning |
| High RAM Usage (Pi/NAS) | Pi + NAS | RAM > 90% for >5 min | Warning |
| Disk Almost Full (Pi/NAS) | Pi + NAS | Disk > 85% for >5 min | Warning |
| High Temperature (Pi/NAS) | Pi + NAS | Temp > 80°C for >2 min | Critical |
| Immich Failed Jobs | Pi | Failed jobs > 0 for >5 min | Warning |
| Nest Metrics Missing | Pi | `absent(nest_ambient_temperature_fahrenheit)` for >5 min | Warning |
| Glances Metrics Missing (Pi) | Pi | `absent(glances_cpu_percent{job="glances-rpi"})` for >5 min | Warning |
| Glances Metrics Missing (NAS) | NAS | `absent(glances_cpu_percent{job="glances-nas"})` for >5 min | Warning |
| Windows Metrics Missing | Gaming PC | `absent(windows_cpu_usage_percent)` for >5 min | Warning |
| Immich Jobs Metrics Missing | Pi | `absent(immich_jobs_active_total)` for >5 min | Warning |

**Two-layer alerting for scrape targets:**
1. **"Scrape Target Down"** — fires when the exporter is unreachable (Prometheus `up == 0`)
2. **"Metrics Missing"** — fires when the exporter responds but its core metric is absent (`absent()`) — catches API auth expiration, upstream schema changes, or empty responses

Alerts are file-provisioned via `nas/docker/grafana/provisioning/alerting/alerts.yml` — rules appear as read-only in the Grafana UI and survive database rebuilds. Changes go through version control: edit the YAML, SCP to NAS, restart Grafana.

Alerts route to Discord via webhook.

### Log Aggregation

Promtail on each machine ships Docker container logs to Loki on the NAS via Docker service discovery. Grafana provides a "Container Logs" dashboard with machine and container filtering.

### Data Retention

- Prometheus: 120 days
- Loki: 120 days

## Consequences

### Positive
- Historical metrics enable "what happened?" analysis after incidents
- Proactive alerts via Discord before problems escalate
- Centralized log search across all machines
- Low additional load: ARM NAS handles I/O-bound Prometheus/Loki well

### Negative
- NAS RAM usage increases by ~400-600MB (still well within 4GB)
- Dashboard rendering may be slightly slower on ARM vs. i7
- ~~Glances metrics not in Prometheus~~ Resolved: custom glances-exporter scrapes REST API and serves Prometheus format

### Trade-offs
- Used Grafana built-in alerting instead of separate Alertmanager (simpler for homelab scale)
- Alert rules are file-provisioned (not API-managed) — ensures they survive database rebuilds and are version-controlled
- Gaming PC Promtail deployed from console (Docker credential helper blocks remote `docker pull` over SSH — file transfer via SCP works fine)

## Related

- ADR-012: Windows Host Metrics Collection Strategy (metrics-endpoint origin)
- ADR-016: System Monitoring Strategy (Glances + LHM approach)
- ADR-017: Immich Jobs Monitoring via Custom Proxy (immich-jobs-proxy origin)
