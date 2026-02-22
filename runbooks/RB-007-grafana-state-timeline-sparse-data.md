# RB-007: Grafana State-Timeline Shows "No Data" With Sparse Time Series

**Date**: 2026-02-21
**Machine**: NAS (Grafana)
**Service**: Grafana dashboards
**Impact**: Alert history visualizations appear empty over wide time ranges despite data existing in Prometheus

## Symptoms

- State-timeline panel displays "No data" message over 7-day range
- Same panel shows data immediately when time range is narrowed to 24h or 6h
- Underlying metrics exist in Prometheus with actual scrape data points
- Refreshing the dashboard/iframe does not fix the issue

## Root Cause

The state-timeline visualization type expects **continuous data** across the entire time range. When a query uses a filter like `grafana_alert_state > 0`, it only returns data points during the brief windows when the condition is true (e.g., alert firing/pending). Over a 7-day period with only 15 minutes of actual data points, Grafana's state-timeline renderer sees a ratio of data-to-empty so sparse that it treats the series as "No data" and gives up rendering.

Time-series database behavior:
- A query like `grafana_alert_state > 0` returns **no samples** when the value is 0 (normal/OK)
- Over a 7-day window with mostly-OK alerts, this produces thousands of missing intervals
- State-timeline needs near-continuous coverage to render; sparse series get hidden

## Fix

Remove the filter from the query. Instead of:
```
grafana_alert_state > 0
```

Use:
```
grafana_alert_state
```

This returns all alerts at all times with their full state values (0, 1, 2). Grafana then:
1. Has continuous data for every alert across the entire range
2. Uses value mappings to color-code the states:
   - 0 (green) = Normal/OK
   - 1 (yellow) = Pending
   - 2 (red) = Firing
3. Renders as solid colored bands (mostly green, with red/yellow segments during incidents)

## Verification

After fixing the query:
1. Open the state-timeline panel over a 7-day range
2. Confirm the data loads and displays all alert names as colored bands
3. Verify alerts that have fired in the past 7 days show red/yellow segments at the correct times

## Prevention

**For sparse data over wide time ranges:**
- Use the **full metric**, not filtered versions (no `> 0`, `== "firing"`, etc.)
- Let Grafana's value mappings and transformations handle state classification
- The state-timeline visualization specifically needs continuous series to render

**For filtering sparse data:**
- If you must filter, use a shorter time range (24h) or a different visualization (table, stat)
- Consider `increase()` or `count_over_time()` for aggregation queries (these handle sparse data better)

## Related

- State-timeline visualization is particularly sensitive to sparse data due to its rendering algorithm
- This is distinct from the `absent()` false-positive issue (RB-002) — that's about how the function interprets missing data, this is about how Grafana renders gaps
