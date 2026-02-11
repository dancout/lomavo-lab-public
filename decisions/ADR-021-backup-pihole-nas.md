# ADR-021: Backup Pi-hole on QNAP NAS

**Status**: Accepted

**Date**: 2026-02-05

## Context

The homelab runs a single Pi-hole instance (v6.3, native install) on the Raspberry Pi for DNS ad-blocking. If the Pi goes down, all DNS resolution stops for the household. A backup Pi-hole on the always-on QNAP NAS provides redundancy while the primary Pi-hole remains authoritative.

Key constraints discovered during deployment:

1. **QNAP runs internal DNS** on container network interfaces (10.0.5.1, 10.0.3.1, 10.0.7.1, 127.0.1.1), occupying port 53 on those addresses
2. **Pi-hole v6 uses new env var format** (`FTLCONF_` prefix) — v5-era `PIHOLE_DNS_` variables silently fail
3. **Docker bridge networking** makes all LAN traffic appear "non-local" to Pi-hole, triggering its default reject behavior
4. **nebula-sync** (Pi-hole v6 sync tool) needs write access to the replica's API, and cannot overwrite env-var-locked settings

## Decision

### Pi-hole Docker Configuration

**Port 53 conflict:** Bind DNS exclusively to the NAS main IP (`<NAS_IP>:53`) rather than `0.0.0.0:53`. Port 53 is free on the main NAS IP — the QNAP internal DNS only binds to container network interfaces and localhost.

**Web UI port:** Use 8089 instead of the default 80, since QNAP's admin interface uses port 8080 and 80 may conflict with other QNAP services.

**Upstream DNS:** Configure Google DNS (8.8.8.8, 8.8.4.4) directly, NOT the primary Pi-hole. Using the primary as upstream would create a circular dependency — if the Pi goes down, the backup Pi-hole couldn't resolve anything either.

**Listening mode:** Set `FTLCONF_dns_listeningMode=ALL` because Docker bridge networking makes LAN queries arrive from the Docker gateway IP (172.17.x.1), which Pi-hole classifies as "non-local" and rejects under the default `LOCAL` listening mode.

**API sudo access:** Set `FTLCONF_webserver_api_app_sudo=true` to grant nebula-sync the write permissions it needs to push teleporter data to the replica.

### nebula-sync Configuration

**Sync tool choice:** nebula-sync (not gravity-sync) because gravity-sync doesn't support Pi-hole v6.

**FULL_SYNC=false:** The replica has several settings locked via environment variables (upstream DNS, listeningMode, api_app_sudo). These are read-only through the Pi-hole API — the API returns HTTP 400 when nebula-sync tries to overwrite them with the primary's values. Using `FULL_SYNC=false` syncs only teleporter data (blocklists, client settings, local DNS records), which is the important part for consistency.

**Docker hostname:** nebula-sync reaches the local Pi-hole container via Docker's internal DNS hostname (`http://pihole`) rather than the NAS IP, since both containers are on the same Docker network.

**Schedule:** Runs every 2 hours (`0 */2 * * *`) with `RUN_GRAVITY=true` to update blocklists after each sync.

## Consequences

**Positive:**
- DNS redundancy — backup Pi-hole available at `<NAS_IP>:53` if the primary fails
- Blocklists, client groups, and local DNS records stay in sync automatically
- NAS is always-on, making it a reliable backup location
- Config differences (upstream DNS, listening mode) are intentional and env-var-locked, preventing accidental overwrite

**Negative:**
- Two Pi-hole instances to manage (mitigated by automated nebula-sync)
- Blocklist changes on the primary take up to 2 hours to propagate to backup
- Manual failover required — devices must be reconfigured to use `<NAS_IP>` as DNS if the Pi goes down (automated failover via Keepalived is a planned next step)

## References

- ADR-008: NAS Storage Configuration
- Pi-hole v6 Docker documentation: `FTLCONF_` environment variables
- nebula-sync: https://github.com/lovelaze/nebula-sync
