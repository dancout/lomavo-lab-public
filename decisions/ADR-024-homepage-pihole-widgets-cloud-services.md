# ADR-024: Homepage Pi-hole Widgets and Cloud Services Section

**Status**: Accepted (Implemented)

**Date**: 2026-02-05

## Context

The Homepage dashboard lacked stats for Pi-hole (both primary and backup instances) and had no quick-access links to cloud provider dashboards (Cloudflare, DigitalOcean) used to manage external aspects of the homelab.

## Decision

### Pi-hole Stats Widgets

Add native Pi-hole widgets to both Homepage entries (primary on Pi, backup on NAS) showing queries, blocked count, and blocked percentage.

**Pi-hole v6 authentication requires app passwords:**

- Pi-hole v6 uses session-based API authentication — the web login password cannot be passed directly as an API key header.
- Homepage's Pi-hole widget authenticates by POSTing the key to `/api/auth` to obtain a session.
- The **web password** (used to log into Pi-hole admin UI) causes HTTP 400 errors when used as the widget key.
- **App passwords** (generated in Pi-hole UI under Settings → Web Interface/API → Expert → Configure app password) work correctly.
- App passwords are separate from the web login — generating one does not change the admin login password.
- When creating an app password for Homepage, no special permissions are needed (leave "prettify output" and "destructive actions" unchecked).

**Homepage version matters:**

- Homepage v1.10.0 had a bug where Pi-hole v6 auth returned 400 errors even with correct credentials.
- Pulling the latest Homepage image resolved the issue.
- Watchtower handles ongoing updates, but if Pi-hole v6 auth breaks after a Pi-hole upgrade, check that Homepage is up to date.

**Widget configuration:**

```yaml
widget:
  type: pihole
  url: http://PI_HOLE_IP  # no trailing slash
  version: 6              # required for v6+
  key: APP_PASSWORD        # app password, not web password
```

The API key is stored in Homepage's `.env` as `HOMEPAGE_VAR_PIHOLE_API_KEY` and shared by both Pi-hole widgets since both instances use the same password (synced via nebula-sync).

### Cloud Services Section

Added a "Cloud Services" section with bookmark-style widgets for:
- **Cloudflare** (`dash.cloudflare.com`) — DNS and CDN management
- **DigitalOcean** (`cloud.digitalocean.com`) — cloud infrastructure

These are simple link widgets with no API integration, providing quick access to external dashboards.

**Icon note:** The `digitalocean.png` dashboard icon doesn't load. Using Simple Icons format (`si-digitalocean`) works reliably.

## Consequences

**Positive:**
- Pi-hole query and blocked stats visible at a glance on the dashboard
- Both primary and backup Pi-hole instances monitored, showing independent stats
- Quick access to cloud provider dashboards without bookmarking URLs
- App password is scoped to read-only API access (no destructive permissions)

**Negative:**
- App password must be manually created in Pi-hole UI (not automatable via config)
- If Pi-hole password changes, a new app password must be generated and updated in Homepage's `.env`
- Homepage version sensitivity — Pi-hole v6 widget support requires a recent Homepage build
