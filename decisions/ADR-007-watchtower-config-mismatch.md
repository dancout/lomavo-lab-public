# ADR-007: Intentional Watchtower Config Mismatch on Gaming PC

**Status:** Superseded
**Date:** 2026-01-28
**Superseded:** 2026-02-14 — Watchtower reactivated with HTTPS push notifications via Caddy reverse proxy (ADR-031)

## Context

While documenting the Gaming PC docker configurations, we created sanitized/parameterized versions in the repo:
- Repo version: Uses `${RPI_IP}` environment variable for the Uptime Kuma notification URL
- Gaming PC actual: Has hardcoded IP `<RPI_IP>`

We needed to decide whether to migrate the Gaming PC to use the parameterized version (like we did for the Raspberry Pi) or leave the mismatch.

## Decision

Leave the intentional mismatch for now. The Gaming PC continues to run with the hardcoded IP while the repo has the parameterized version.

**Reasoning:**
1. Watchtower already has a known issue (expects HTTPS but we don't have reverse proxy set up)
2. The Raspberry Pi IP (`<RPI_IP>`) is unlikely to change in the near term
3. Migrating adds risk and complexity for minimal immediate benefit
4. We'll need to touch watchtower config anyway when fixing the HTTPS issue

## Consequences

**Positive:**
- No risk of breaking a working (albeit imperfect) setup
- Defers work until it can be bundled with HTTPS fix
- Repo still serves as documentation of the intended parameterized approach

**Negative:**
- Repo and Gaming PC are not perfectly in sync for watchtower
- Must remember to reconcile when fixing HTTPS issue

## Future Action

When fixing the watchtower HTTPS notification issue (resolved — see `completed.md` Feb 2026):
1. Create `.env` file in watchtower directory on Gaming PC with `RPI_IP=<RPI_IP>`
2. Copy parameterized docker-compose.yml from repo to Gaming PC
3. Restart watchtower container
4. Verify notifications work

## Resolution

As of February 2026, Caddy reverse proxy is deployed on the Pi (ADR-031) providing valid HTTPS for `status.<DOMAIN>`. Watchtower has been reconfigured with:
- Image: `ghcr.io/nicholas-fedor/watchtower` (active community fork)
- HTTPS push notifications via `generic+https://status.<DOMAIN>/api/push/...`
- Cron schedule: daily at 3 AM (replaces run-once + interval workaround)
- Proper `.env` file for the push token (no more hardcoded IPs or env var mismatches)

The config mismatch between repo and Gaming PC no longer exists.

## Related

- `gaming-pc/README.md` - Watchtower documented as running service
- ADR-031 - Reverse Proxy with Caddy and Split-Horizon DNS (enabled this fix)
