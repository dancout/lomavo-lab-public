# RB-002: absent() Alert False Positive Due to noDataState

**Date**: 2026-02-11
**Machine**: NAS (Grafana)
**Service**: Grafana alerting
**Impact**: False "Nest Metrics Missing" Discord alert fired immediately after alert creation, despite metrics flowing correctly

## Symptoms

- Discord alert: "Nest thermostat metrics have stopped appearing"
- Grafana shows alert in "Alerting" state
- Prometheus metrics are actually present and flowing normally
- `curl http://<RPI_IP>:9102/metrics` returns valid data

## Root Cause

The `absent()` Prometheus function returns:
- **1** when the metric does not exist (metric is missing)
- **empty/no data** when the metric exists (everything is fine)

The alert was configured with `noDataState: "Alerting"`, which means "treat no data as an alert." Since `absent()` returns no data when things are working correctly, the alert fires precisely when it shouldn't.

## Fix

Change `noDataState` from `"Alerting"` to `"OK"` on all `absent()` alert rules:

```
# Via Grafana API - get the rule, modify, PUT back
curl -s -u "admin:PASSWORD" \
  "http://<NAS_IP>:3030/api/v1/provisioning/alert-rules/RULE_UID" | \
  python3 -c "
import sys,json
r = json.load(sys.stdin)
r['noDataState'] = 'OK'
for k in ['id','uid','orgID','updated','provenance','isPaused','notification_settings','record','keep_firing_for']:
    r.pop(k, None)
json.dump(r, sys.stdout)
" | curl -s -u "admin:PASSWORD" -X PUT \
  "http://<NAS_IP>:3030/api/v1/provisioning/alert-rules/RULE_UID" \
  -H "Content-Type: application/json" \
  -H "X-Disable-Provenance: " \
  -d @-
```

Or edit in the Grafana UI: Alert rule → Edit → Error handling → "If no data or all values are null" → set to "OK".

## Prevention

When creating `absent()` alerts, **always** set `noDataState: "OK"`. This is the opposite of most alerts where you want no-data to be alarming. With `absent()`, no data means the metric exists and the function has nothing to report — which is the healthy state.

The correct configuration for `absent()` alerts:
- `noDataState: "OK"` — no data from absent() means the metric exists
- `execErrState: "Alerting"` — query execution errors should still alert
- `for: "5m"` — avoid transient blips during scrape gaps
