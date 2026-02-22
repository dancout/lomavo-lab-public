# ADR-023: Pi-hole DHCP with VIP Advertisement

**Status**: Accepted (Implemented)

**Date**: 2026-02-05

## Context

With Keepalived HA deployed (ADR-022), a Virtual IP (<VIP>) floats between the Pi (MASTER) and NAS (BACKUP) for DNS failover. However, devices still need to be configured to use this VIP instead of the Pi's direct IP (<RPI_IP>).

### Xfinity Gateway Limitations (Critical Context)

Xfinity gateways have multiple hard limitations that prevent standard DNS configuration:

1. **Cannot change advertised DNS:** The DNS server setting is locked in firmware. Even if a "DNS" field appears in the admin interface, the gateway overrides it and advertises Comcast's DNS servers (75.75.75.75, 75.75.76.76, and IPv6 equivalents like 2001:558:feed::1).

2. **Cannot disable DHCP:** There is no option to turn off the DHCP server on Xfinity gateways. The only way to fully disable it is bridge mode, which requires your own router.

3. **DNS interception:** Xfinity gateways intercept port 53 traffic and may redirect it to Comcast DNS regardless of device settings.

These limitations are documented in Xfinity community forums and are intentional. The only workarounds are:
- **Bridge mode** — requires purchasing your own router, loses xFi features
- **Run your own DHCP** — Pi-hole DHCP alongside Xfinity's minimized range (chosen approach)
- **Manual device configuration** — tedious, doesn't work for IoT devices

### State Before This Change

- **DHCP server:** Xfinity gateway with range 150-151 (intentionally minimized)
- **DNS advertised by Xfinity:** Comcast DNS primary, Pi-hole (<RPI_IP>) as tertiary
- **Result:** Devices used Comcast DNS first, Pi-hole as fallback — inconsistent ad-blocking

## Decision

**Enable Pi-hole as the DHCP server** on the Raspberry Pi. Since Xfinity DHCP cannot be disabled, both run simultaneously but with non-overlapping ranges:
- Xfinity: <RPI_IP> - <RPI_IP+1> (2 IPs, rarely used)
- Pi-hole: 10.0.0.10 - 10.0.0.100 (91 IPs, handles most requests)

Pi-hole advertises `<VIP>` (the Keepalived VIP) as the DNS server to all clients.

### Implementation Details

**Pi-hole v6 DHCP configuration** (set via `pihole-FTL --config`):

| Setting | Value |
|---------|-------|
| `dhcp.active` | `true` |
| `dhcp.start` | `10.0.0.10` |
| `dhcp.end` | `10.0.0.100` |
| `dhcp.router` | `<ROUTER_IP>` |
| `misc.dnsmasq_lines` | `["dhcp-option=option:dns-server,<VIP>"]` |

**Key technical detail:** By default, Pi-hole DHCP advertises itself as the DNS server. To advertise the VIP instead, we use a custom dnsmasq option via `misc.dnsmasq_lines`. This tells dnsmasq to send DHCP option 6 (dns-server) with the VIP address.

**Commands used:**
```bash
sudo pihole-FTL --config dhcp.start '10.0.0.10'
sudo pihole-FTL --config dhcp.end '10.0.0.100'
sudo pihole-FTL --config dhcp.router '<ROUTER_IP>'
sudo pihole-FTL --config misc.dnsmasq_lines '["dhcp-option=option:dns-server,<VIP>"]'
sudo pihole-FTL --config dhcp.active true
```

### What This Achieves

1. All DHCP clients automatically receive <VIP> as their DNS server
2. DNS queries go to VIP → Keepalived routes to healthy Pi-hole (Pi or NAS)
3. No manual device configuration needed
4. Full ad-blocking coverage for all devices
5. Xfinity DHCP effectively sidelined (only 2 IPs in its range)

## DHCP Failover: Not Implemented (Intentional)

**Current limitation:** Only the Pi runs DHCP. If the Pi goes down:
- **Existing devices continue working** — DNS fails over to NAS via VIP, and devices keep their IP until lease expires
- **Lease renewal during outage** — Devices try to renew at ~50% of lease time (12h). If Pi is down, renewal fails but device keeps its IP until full lease expiration (24h)
- **New devices cannot join** — No DHCP server to assign IPs until Pi recovers

**Why this is acceptable:**
- Pi downtime is rare and brief (reboots, updates)
- DHCP leases last 24 hours — devices hold their IPs through brief outages
- The window where a new device needs DHCP during a Pi outage is very small

### Future Options for Full DHCP HA

If DHCP failover becomes necessary, three approaches exist:

#### Option 1: Split-Scope DHCP (Simple but wasteful)
- Pi DHCP range: 10.0.0.10 - 10.0.0.50
- NAS DHCP range: 10.0.0.51 - 10.0.0.100
- Both run simultaneously, each owns half the pool
- **Pros**: Simple, no coordination needed
- **Cons**: Wastes half the IP pool if one server is down

#### Option 2: Keepalived Notify Scripts (Recommended if needed)
- Enable DHCP on NAS Pi-hole with same range as Pi
- Add Keepalived notify scripts that start/stop DHCP when VIP moves:
  - MASTER: Start DHCP
  - BACKUP: Stop DHCP
- Only the VIP holder runs DHCP at any time
- **Pros**: Full pool always available, clean failover
- **Cons**: Leases don't transfer (devices may get new IPs after failover), requires script development

#### Option 3: ISC DHCP or Kea with Failover Protocol
- Replace dnsmasq DHCP with ISC DHCP or Kea
- Native DHCP failover protocol syncs lease state between servers
- **Pros**: Proper lease synchronization, enterprise-grade
- **Cons**: Significant complexity, overkill for homelab

**Decision**: Defer DHCP HA. Revisit if Pi reliability becomes an issue.

## Consequences

**Positive:**
- All devices automatically use the Pi-hole VIP for DNS
- No manual device configuration required
- Ad-blocking coverage is complete and automatic
- Simpler than alternatives (bridge mode, manual config per device)
- Works around Xfinity's locked-down gateway without replacing hardware

**Negative:**
- Single point of failure for DHCP (Pi only)
- If Pi is down, new devices can't join network until it recovers
- Two DHCP servers running (Xfinity + Pi-hole) — potential for rare conflicts if a device gets an IP from Xfinity's tiny range
- Devices getting IPs from Xfinity (150-151) will receive Comcast DNS instead of the VIP

## Verification

After implementation, verify a device received the correct DNS:
- **Mac:** `scutil --dns | grep nameserver` — should show <VIP>
- **iPhone/Android:** Settings → Wi-Fi → (i) on network → DNS should show <VIP>
- Toggle Wi-Fi or airplane mode to force DHCP renewal if needed

## References

- ADR-022: Keepalived HA for Pi-hole DNS Failover
- Xfinity DNS limitation: https://forums.xfinity.com/conversations/your-home-network/change-dns-server/602daf00c5375f08cdfd63db
- Xfinity DHCP cannot be disabled: https://forums.xfinity.com/conversations/your-home-network/disable-dhcp-on-xb8t-how-can-i-do-this-for-starters/6885c4101724e917a0243414
- Pi-hole v6 custom DNS advertisement: https://discourse.pi-hole.net/t/how-to-change-broadcasted-dns-ip-address-in-dhcp-v6/75994
- Pi-hole with Xfinity workaround: https://discourse.pi-hole.net/t/please-help-me-think-out-adding-pi-hole-to-my-parents-xfinity-setup/4241
