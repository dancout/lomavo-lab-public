# RB-003: Pi-hole Homepage Widget Broken After Port Change

**Date**: 2026-02-12
**Machine**: Raspberry Pi (Homepage)
**Service**: Homepage Pi-hole widget
**Impact**: Pi-hole widget on Homepage dashboard shows "API Error: Unexpected token 'I', "Internal S"... is not valid JSON"

## Symptoms

- Pi-hole widget on Homepage shows JSON parse error
- NAS backup Pi-hole widget still works (its port didn't change)
- Pi-hole admin UI works fine at the new port (`http://<RPI_IP>:8088/admin`)

## Root Cause

Pi-hole web UI was moved from port 80 to port 8088 (to free port 80 for Caddy reverse proxy — ADR-031). The Homepage `services.yaml` Pi-hole widget still pointed to the old port:

```yaml
# Before (broken):
url: http://{{HOMEPAGE_VAR_RPI_IP}}       # port 80 — now serves Caddy
href: http://{{HOMEPAGE_VAR_RPI_IP}}/admin  # port 80

# After (fixed):
url: http://{{HOMEPAGE_VAR_RPI_IP}}:8088
href: http://{{HOMEPAGE_VAR_RPI_IP}}:8088/admin
```

Port 80 is now Caddy's HTTP→HTTPS redirect. When the Homepage widget hit port 80, Caddy returned an HTML redirect page, which the Pi-hole API parser tried to parse as JSON — producing the "Internal S..." (Internal Server Error or redirect HTML) parse failure.

## Fix

Update `rpi/docker/homepage/config/services.yaml` — change the Pi-hole widget `url` and `href` to use port 8088:

```bash
# Deploy the fix
scp rpi/docker/homepage/config/services.yaml <RPI_USER>@<RPI_IP>:/tmp/services.yaml
ssh <RPI_USER>@<RPI_IP> "sudo cp /tmp/services.yaml ~/homepage/config/services.yaml && cd ~/homepage && docker compose restart"
```

## Prevention

When changing a service's port, check for all references to that port:
1. **Homepage** `services.yaml` — widget `url` and `href` fields
2. **Uptime Kuma** — monitoring URL for the service
3. **Prometheus** scrape targets — if the service is scraped
4. **Caddy** `Caddyfile` — reverse proxy upstream
5. **Other services** — anything that calls the service's API (e.g., nebula-sync, keepalived health checks)

A quick way to find all port references: `grep -r "OLD_PORT" rpi/ nas/ gaming-pc/ infrastructure/`
