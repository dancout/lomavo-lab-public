# ADR-022: Keepalived HA for Pi-hole DNS Failover

**Status**: Accepted

**Date**: 2026-02-05

## Context

With the backup Pi-hole deployed on the NAS (ADR-021), DNS redundancy exists but requires manual failover — devices must be reconfigured to point at the NAS IP if the Pi goes down. Automatic failover via a shared Virtual IP (VIP) eliminates this manual step.

Key constraints:
1. QNAP NAS cannot install native packages (BusyBox environment)
2. Pi-hole on NAS runs in Docker with bridge networking, binding to specific IPs
3. The VIP must not conflict with DHCP ranges (Pi-hole: 10-100, Xfinity: 150-151)
4. Consumer network — multicast VRRP may not be reliable

## Decision

### Architecture

Keepalived VRRP manages a floating VIP (`<VIP>`) between the Pi (MASTER, priority 150) and NAS (BACKUP, priority 100). Devices query `<VIP>` and automatically reach whichever Pi-hole is healthy.

### Keepalived on Pi — Native Install

Installed via `apt install keepalived`. Runs as a systemd service. Health check script uses `dig @127.0.0.1 google.com` to verify Pi-hole can actually resolve DNS (not just that the port is open).

### Keepalived on NAS — Docker Container

Uses `shawly/keepalived` image with `network_mode: host` and `NET_ADMIN`/`NET_BROADCAST`/`NET_RAW` capabilities. Health check uses `nslookup` (available in Alpine) against the NAS IP.

**Script ownership:** The health check script must be owned by root (UID 0) on the NAS filesystem for Keepalived's `enable_script_security` to accept it. On QNAP, UID 0 maps to the `admin` user.

### VRRP Configuration

- **Unicast mode:** More reliable than multicast on consumer networks. Each node explicitly addresses its peer.
- **Priority:** Pi=150 (always preferred when healthy), NAS=100 (backup only)
- **Health check:** DNS query every 2s, failover after 2 consecutive failures (~5s total)
- **Authentication:** Simple password (`pihole`) — sufficient for a trusted LAN

### VIP Port Binding on NAS

The NAS Pi-hole Docker container binds to both the NAS IP and the VIP for port 53. This requires `net.ipv4.ip_nonlocal_bind=1` on the host so Docker can bind to the VIP even when it's not assigned to the interface.

**QNAP sysctl persistence:** QNAP has no `/etc/sysctl.conf` or sysctl.d directory. The solution is a `sysctl-init` container in the Pi-hole compose that runs `nsenter -t 1 -m -u -i -n sysctl -w net.ipv4.ip_nonlocal_bind=1` at startup. This uses nsenter to execute the sysctl in the host's PID 1 namespace, bypassing QNAP's lack of root SSH access.

### DNS Switch (Deferred)

The VIP is operational but devices still query `<RPI_IP>` directly. Switching the DHCP DNS advertisement from `<RPI_IP>` to `<VIP>` is a separate step that requires updating Pi-hole's DHCP settings and potentially the router's DNS config. This is the only step that affects internet connectivity.

## Consequences

**Positive:**
- Automatic DNS failover in ~5 seconds when Pi goes down
- No manual intervention needed — VIP floats automatically
- Health check verifies actual DNS resolution, not just port availability
- VIP (`<VIP>`) is outside all DHCP ranges, avoiding conflicts
- sysctl-init pattern solves QNAP's lack of persistent sysctl config

**Negative:**
- Keepalived on NAS depends on Docker host networking and privileged capabilities
- `ip_nonlocal_bind=1` is a system-wide setting (affects all services, not just Pi-hole)
- Health check script on NAS must be manually chowned to root after re-deployment
- DNS switch to VIP still pending — current setup only adds the VIP as a secondary path

## References

- ADR-021: Backup Pi-hole on QNAP NAS
- Keepalived documentation: https://keepalived.org
- shawly/keepalived Docker image
