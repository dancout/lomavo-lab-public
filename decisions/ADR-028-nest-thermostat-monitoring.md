# ADR-028: Nest Thermostat Monitoring via Custom Exporter

**Status:** Accepted
**Date:** 2026-02-11

## Context

A Nest Gen 3 thermostat was installed and we want to track temperature, setpoints, humidity, and furnace/AC activity over time. The data should integrate into the existing Prometheus + Grafana monitoring stack on the NAS.

The Google Smart Device Management (SDM) API is the official way to access Nest data. It requires a Google Cloud project, a Device Access registration ($5 one-time fee), and OAuth2 credentials. The Nest is linked through Google Home.

## Decision

Build a custom `nest-exporter` Python container on the Raspberry Pi that polls the SDM API and serves Prometheus metrics at port 9102.

### Why Custom Exporter

Existing open-source Nest Prometheus exporters (Pronestheus, etc.) are stale (last updated 2020-2021), written in Go, and miss metrics we want (HVAC activity, eco mode, fan status). Building custom:

- Matches the Python exporter pattern already in use (`glances-exporter`, `immich-jobs-proxy`)
- Uses only Python stdlib (no pip dependencies)
- Gives full control over exposed metrics
- Easy to maintain alongside existing exporters

### Why the Pi

- Always-on (NAS also always-on, but Pi already runs both other custom exporters)
- Can `docker build` natively (NAS cannot — QNAP Docker build is broken)
- Lightweight container (~50MB image)

### SDM API Setup (Manual Prerequisites)

1. Register at https://console.nest.google.com/device-access ($5 one-time) — get **SDM Project ID**
2. Create Google Cloud project, enable Smart Device Management API
3. Configure OAuth consent screen (External, test user = your Gmail)
4. Create OAuth 2.0 Client ID (Web application) with `https://www.google.com` as redirect URI
5. Authorize via Google URL, exchange auth code for **Refresh Token**

### Metrics Exposed (port 9102)

| Metric | Type | Description |
|--------|------|-------------|
| `nest_ambient_temperature_celsius` | gauge | Current room temperature (C) |
| `nest_ambient_temperature_fahrenheit` | gauge | Current room temperature (F) |
| `nest_target_temperature_heat_celsius` | gauge | Heat setpoint (C) |
| `nest_target_temperature_heat_fahrenheit` | gauge | Heat setpoint (F) |
| `nest_target_temperature_cool_celsius` | gauge | Cool setpoint (C) |
| `nest_target_temperature_cool_fahrenheit` | gauge | Cool setpoint (F) |
| `nest_humidity_percent` | gauge | Room humidity |
| `nest_hvac_status` | gauge | 0=OFF, 1=HEATING, 2=COOLING |
| `nest_thermostat_mode` | gauge | 0=OFF, 1=HEAT, 2=COOL, 3=HEATCOOL |
| `nest_eco_mode` | gauge | 0=OFF, 1=MANUAL_ECO |
| `nest_eco_temperature_heat_celsius` | gauge | Eco heat setpoint (C) |
| `nest_eco_temperature_heat_fahrenheit` | gauge | Eco heat setpoint (F) |
| `nest_eco_temperature_cool_celsius` | gauge | Eco cool setpoint (C) |
| `nest_eco_temperature_cool_fahrenheit` | gauge | Eco cool setpoint (F) |
| `nest_fan_active` | gauge | 0=OFF, 1=ON |
| `nest_fan_timer_end_seconds` | gauge | Unix timestamp when fan timer expires (only present when timer active) |
| `nest_connectivity` | gauge | 0=OFFLINE, 1=ONLINE |

### Endpoints

| Path | Response | Purpose |
|------|----------|---------|
| `/metrics` | Prometheus text format | Prometheus scraping |
| `/` | JSON summary (Fahrenheit) | Homepage widget |
| `/health` | `{"status": "ok"}` | Uptime Kuma |

### Architecture

```
Nest Thermostat ←→ Google Cloud ←→ SDM API
                                      ↑
                              nest-exporter (Pi:9102)
                                      ↑
                              Prometheus (NAS:9090)
                                      ↑
                              Grafana (NAS:3030)
```

Poll interval: 60 seconds (within SDM API rate limits, sufficient for thermostat data).

OAuth2 refresh tokens are used to maintain access — the exporter automatically refreshes the access token before expiry.

## Consequences

### Positive
- Full thermostat history in Prometheus (temperature trends, HVAC duty cycles)
- HVAC on/off tracking enables furnace efficiency analysis
- Follows established exporter pattern — consistent with glances-exporter
- Both Celsius and Fahrenheit stored — Grafana dashboards use F

### Negative
- Depends on Google Cloud API availability (cached data survives brief outages)
- OAuth2 refresh tokens can expire if not used for 6 months (rare with 60s polling)
- $5 one-time Device Access fee

### Trade-offs
- 60s poll interval balances API rate limits vs. data granularity (thermostat data doesn't change faster than this)
- Custom build vs. existing exporters: more work upfront but exact metrics coverage and consistent maintenance

## Related

- ADR-025: Prometheus + Grafana + Loki Monitoring Stack (where metrics are stored)
- ADR-016: System Monitoring Strategy (monitoring patterns)
