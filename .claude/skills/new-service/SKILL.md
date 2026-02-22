---
name: new-service
description: Full new service deployment following CONTRIBUTING.md checklist
auto_invoke: false
arguments: "Service name and target machine (e.g., 'watchtower on nas')"
---

# /new-service — New Service Deployment Checklist

Deploy a new service end-to-end following CONTRIBUTING.md's "New Service Deployment Checklist."

## Phases

### Phase 1: Prerequisites

- [ ] Identify target machine (Pi, Gaming PC, NAS)
- [ ] Collect credentials, API keys, or manual setup outputs the user must provide
- [ ] Walk user through any prerequisite actions BEFORE writing code
- [ ] Check `infrastructure/services.md` for port conflicts
- [ ] Read target machine README for directory structure conventions

### Phase 2: Code & Config

- [ ] Create service files: `docker-compose.yml`, `.env.example`, Dockerfile (if custom)
- [ ] Place in repo under `<machine>/docker/<service-name>/`
- [ ] Deploy to target machine:
  - **Pi:** SCP + SSH (`cd ~/SERVICE && docker compose up -d`)
  - **Gaming PC:** Give user exact commands to run on console (credential store issue prevents SSH docker compose)
  - **NAS:** SCP to `/share/CACHEDEV1_DATA/docker/SERVICE/`, SSH with PATH + DOCKER_HOST prefix
- [ ] Verify endpoints respond

### Phase 3: Observability

- [ ] **Prometheus scrape job** (if service exposes metrics) — add to `nas/docker/prometheus/prometheus.yml`, deploy to NAS, reload Prometheus
- [ ] **Verify scrape target** shows UP — "Scrape Target Down" alert covers reachability automatically
- [ ] **absent() alert** for one core metric — pattern: `absent(core_metric{job="job-name"})`, 5m threshold, warning severity, `noDataState: OK`. Add to `nas/docker/grafana/provisioning/alerting/alerts.yml`, SCP to NAS, restart Grafana
- [ ] **Grafana dashboard** (if data worth visualizing) — JSON to `nas/docker/grafana/provisioning/dashboards/`, SCP to NAS, restart Grafana
- [ ] **Homepage widget** — add to `rpi/docker/homepage/config/services.yaml`, deploy via SCP → /tmp → sudo cp → `docker compose up -d`
- [ ] **Uptime Kuma** — tell user the entry to add (URL, check type, keyword)

### Phase 4: Reverse Proxy (if web UI)

- [ ] Add Caddy entry to `rpi/docker/caddy/Caddyfile`
- [ ] Add dnsmasq entry to both Pi-holes (if new subdomain)
- [ ] Deploy Caddy config, restart Caddy
- [ ] Update Homepage `href` to use `https://<subdomain>.<DOMAIN>`

### Phase 5: Documentation

- [ ] `infrastructure/services.md` — add to machine table
- [ ] Machine README — services table, directory structure, env vars, directory mapping
- [ ] `decisions/ADR-XXX` + `decisions/README.md` — if non-obvious decisions
- [ ] `.env.example` — if new secrets added
- [ ] `next-steps.md` — mark items complete
- [ ] Relevant `plans/*.md` topic file — check off completed items
- [ ] `completed.md` — add summary

### Reminders

- `docker compose restart` does NOT re-read `.env` — always use `docker compose up -d`
- Gaming PC Docker commands must be run by user on console (not over SSH)
- NAS Docker requires PATH and DOCKER_HOST prefix for all commands
- Homepage deploy: SCP to /tmp, sudo cp to ~/homepage/config/, then `docker compose up -d`
