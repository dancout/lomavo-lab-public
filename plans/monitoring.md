# Monitoring

Advanced monitoring, metrics, and alerting improvements.

## Remaining Phase 2 Items

- [ ] Add NAS snapshot pool metrics to Homepage (requires SSH/SNMP — ADR-014)
- [ ] Native Glances on Windows for richer host metrics (intermediate step — ADR-012)
- [x] Increase Nest exporter alert threshold from 5min to 15min (frequent false alarms)
- [ ] Align Uptime Kuma monitors with Grafana up/down alerts (single source of truth for service health)
- [ ] Watchtower update notifications — alert (Discord or Grafana) when Watchtower auto-updates a container image on any node
- [x] Outage history dashboard — Grafana "Outage History" dashboard with alert timeline, cumulative duration, frequency, and current status panels
- [ ] Power consumption tracking — **deferred: requires smart plug hardware**. See `plans/infrastructure.md`

## Ollama Prometheus Metrics

Ollama does not natively expose Prometheus-format metrics. Current monitoring:
- Uptime Kuma HTTP check on `:11434/api/tags` (availability)
- Container logs via Promtail → Loki (errors, model load events)
- Host resource usage via existing metrics-endpoint (CPU/RAM impact of inference)

Options for inference-level metrics (tokens/sec, model load times, request counts):
- [ ] Custom `ollama-exporter` (same pattern as `glances-exporter`): scrape Ollama `/api/ps`
- [ ] Wait for native Ollama Prometheus support (requested upstream)
- [ ] OpenTelemetry integration via Open WebUI
