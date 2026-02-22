# Monitoring Gotchas

Operational knowledge for Prometheus, Grafana, Glances, and the monitoring stack.

## Glances Prometheus Export

`--export prometheus` is incompatible with `-w` (webserver mode) in the Glances Docker image. Error: "Export is only available in standalone or client mode."

**Solution:** Custom `glances-exporter` Python container that scrapes the Glances REST API and serves Prometheus-format `/metrics`. Deployed alongside Glances on each machine at port 9101.

## Grafana absent() Alerts

`absent()` returns empty/no data when the metric EXISTS (healthy) and returns 1 when the metric is MISSING.

**Critical:** Must set `noDataState: "OK"` — otherwise "no data" (the healthy state!) triggers the alert. Set `execErrState: "Alerting"` so query errors still alert.

**Pattern:** One core metric per scrape target, 5m threshold, warning severity.

**API provenance:** Rules created via API have `provenance: "api"`. Updates need `X-Disable-Provenance:` header, deletes need matching provenance. File-provisioned rules appear read-only in the UI.

See runbook RB-002 for the incident that discovered this.

## Grafana Alert Provisioning

Alert rules are file-provisioned via the Grafana provisioning directory (`provisioning/alerting/alerts.yml`). Rules appear read-only in the Grafana UI.

**Deploy pattern:** Edit YAML in repo, SCP to the Grafana host, restart Grafana container.

## Grafana on ARM

First startup takes ~2-3 minutes for DB migrations on ARM Cortex-A55. Don't assume it's broken if it doesn't respond immediately after deployment.

## Prometheus Secret Management

Prometheus has no native `.env` or variable substitution. The repo `prometheus.yml` uses `${VAR}` placeholders for IPs and the Qdrant API key.

**Solution (ADR-036):** `deploy.sh` uses `envsubst` (standard Unix tool) to resolve variables from `.env.local`, then SCPs the resolved config to NAS and restarts Prometheus.

**Usage:** Run `./nas/docker/prometheus/deploy.sh` from repo root.

**Lightweight:** No new project dependencies — `envsubst` is a standard Unix tool already available on macOS, Linux, and WSL. If missing, the script provides install instructions.

**WARNING:** Do NOT SCP `prometheus.yml` directly — it contains unresolved `${VAR}` placeholders. Always use `deploy.sh`.

**Qdrant specifics:** The `/metrics` endpoint requires Bearer authentication (`QDRANT_API_KEY` in `.env.local`). The deploy script masks the key in output.
