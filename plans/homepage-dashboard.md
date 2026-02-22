# Homepage & Dashboard

Items related to Homepage widgets and dashboard improvements.

- [x] Paperless-ngx storage widget — `paperless-stats-proxy` on Pi (port 8086) sums actual document sizes via HEAD requests on download endpoints, cached 5min. Shows document count + storage bytes on Homepage. Also exposes `/metrics` for Prometheus.
- [x] Paperless-ngx active jobs — extended `paperless-stats-proxy` to also fetch `/api/tasks/` and count by status. Shows active/pending/failed on Homepage.
- [x] Storage trends over time — Prometheus now scrapes `paperless-stats` (port 8086, 5min interval) and `immich-jobs` (already scraped, extended with `immich_photos_total`/`immich_videos_total`/`immich_storage_bytes`). Grafana "Storage Trends" dashboard shows Immich counts, Immich storage, Paperless docs, Paperless storage, NAS disk usage, and monitoring data dirs over 30d.
- [x] Firing alerts on Homepage — new `grafana-alerts-proxy` on Pi (port 8087) queries Grafana rules API and returns firing/pending/normal counts. Homepage widget in Monitoring section. Also scraped by Prometheus.
- [x] Outage history dashboard — Grafana "Outage History" dashboard with alert timeline (state-timeline), cumulative firing duration (bar chart), alert frequency (stat), and current status (table).
- [x] Discord link on Homepage — added to Cloud Services section with `HOMEPAGE_VAR_DISCORD_URL` env var.
- [x] Change the NEST missing scrape data alert from 5 min missing data to 15 min missing data — updated `for: 15m` with 20-min lookback window.
- [ ] Power consumption tracking — **deferred: requires smart plug hardware** (e.g., 3x TP-Link Kasa KP115). See `plans/infrastructure.md` Power Management section.
