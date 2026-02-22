# ADR-031: Reverse Proxy with Caddy and Split-Horizon DNS

**Status:** Accepted
**Date:** 2026-02-12

## Context

All homelab services required `IP:port` access (e.g., `<RPI_IP>:3000` for Homepage), which is hard to remember and doesn't support HTTPS. VaultWarden showed a browser security warning due to self-signed certificates. Watchtower HTTPS notifications were blocked (ADR-007) because Uptime Kuma's push endpoint required a trusted certificate.

We needed:
- Friendly URLs like `home.<DOMAIN>` for LAN services
- Valid HTTPS certificates (not self-signed)
- No dependency on port forwarding (Xfinity router has limited capabilities)

### Xfinity Router Constraints

- **No hairpin NAT** — can't access your own public IP from inside the LAN
- **DNS hijacking** — gateway intercepts port 53 traffic to force Comcast DNS
- **Locked DHCP/DNS settings** — can't change advertised DNS servers in firmware
- **IPv6 cannot be disabled** — no setting exists on Xfinity gateways
- **IPv6 Router Advertisement DNS injection** — the Xfinity gateway sends IPv6 Router Advertisements (RAs) with Comcast's DNS servers (`2001:558:feed::1`, `2001:558:feed::2`) via the RDNSS option. These are multicast to **all devices** on the LAN, bypassing DHCP entirely. macOS and many other OSes prioritize these IPv6 DNS servers over IPv4 DNS from Pi-hole DHCP, causing `*.<DOMAIN>` lookups to hit Comcast DNS first (which returns NXDOMAIN).

**What this means:** Even devices with Pi-hole DHCP leases (and the VIP as their IPv4 DNS) may fail to resolve `*.<DOMAIN>` because the OS queries Comcast's IPv6 DNS first. This is not a "minor gap" — it affects most devices on the network.

**Current workaround:** Manually set DNS to `<VIP>` (VIP) on each device. This overrides both DHCP and RA-provided DNS servers.

**Devices configured (2026-02-12):**

| Device | DNS Setting | Method |
|--------|-----------|--------|
| Raspberry Pi | `127.0.0.1` (own Pi-hole) | `nmcli connection modify netplan-eth0 ipv4.dns '127.0.0.1' ipv6.ignore-auto-dns yes` |
| MacBook Air M4 | `<VIP>` (VIP) | `networksetup -setdnsservers Wi-Fi <VIP>` |
| Gaming PC | `<VIP>` (VIP) | `Set-DnsClientServerAddress -InterfaceIndex 15 -ServerAddresses <VIP>` + `netsh interface ipv6 set interface "Ethernet 2" rabaseddnsconfig=disable` + `Set-NetIPInterface -InterfaceIndex 15 -AddressFamily IPv6 -Dhcp Disabled` |
| QNAP NAS | No change needed | Internal DNS (`127.0.1.1`) already forwards to Pi-hole; resolves `*.<DOMAIN>` correctly |
| iPhones, MacBook Pros | Manual: `<VIP>` | Settings → Wi-Fi → Configure DNS → Manual (iOS) or System Settings → Wi-Fi → Details → DNS (macOS) |

**Note on Gaming PC:** Windows accepts IPv6 RDNSS from Router Advertisements even when IPv4 DNS is manually configured. Simply setting `Set-DnsClientServerAddress` is insufficient — must also run `netsh interface ipv6 set interface "Ethernet 2" rabaseddnsconfig=disable` to prevent Windows from using the Comcast IPv6 DNS servers injected by the Xfinity gateway's Router Advertisements.

**Permanent fix:** Put the Xfinity gateway in bridge mode and use a separate router with full control over DHCP, DNS, and IPv6 RA settings. This eliminates the competing DNS advertisements entirely.

## Decision

### Reverse Proxy: Caddy v2

Chose Caddy over alternatives (Nginx Proxy Manager, Traefik, HAProxy):
- **Automatic HTTPS** — Caddy handles certificate issuance/renewal natively
- **Simple config** — Caddyfile syntax is minimal compared to Nginx or Traefik YAML
- **DNS-01 support** — Cloudflare DNS plugin enables certificate issuance without opening ports 80/443 to the internet
- **Single binary** — lightweight for Pi's ARM resources

### DNS: Split-Horizon via Pi-hole dnsmasq

Wildcard dnsmasq rule `address=/<DOMAIN>/<RPI_IP>` on both Pi-holes:
- All `*.<DOMAIN>` resolves to the Pi's IP on LAN
- Cloudflare handles public DNS for the domain (unchanged)
- Adding future services requires only a new Caddyfile block — no DNS changes

Pi-hole v6 Docker (NAS backup) requires `misc.etc_dnsmasq_d=true` to load custom dnsmasq configs from `/etc/dnsmasq.d/`.

### TLS: Let's Encrypt via DNS-01

- DNS-01 challenge proves domain ownership by creating a TXT record in Cloudflare DNS
- No ports need to be opened on the router — works entirely via Cloudflare API
- Cloudflare API Token scoped to Zone:DNS:Edit for the domain

### Architecture

```
Browser → home.<DOMAIN>
       → Pi-hole VIP resolves to <RPI_IP>  (wildcard dnsmasq rule)
       → Caddy on Pi (port 443)              (terminates HTTPS, valid Let's Encrypt cert)
       → reverse_proxy localhost:3000         (Homepage)
```

### Pi-hole Port Change

Pi-hole web UI moved from port 80 to 8088 to free port 80 for Caddy's HTTP→HTTPS redirect. Port 8088 chosen to avoid conflicts with VaultWarden (8080) and NAS Pi-hole (8089).

### Deployment

Caddy runs in Docker on the Pi with host networking, using the pre-built `caddybuilds/caddy-cloudflare` image (includes the Cloudflare DNS plugin). Building Caddy from source with xcaddy was attempted but infeasible on the Pi's 1GB RAM (Go linker thrashes swap for hours). Environment variables (DOMAIN, CLOUDFLARE_API_TOKEN, GAMING_PC_IP, NAS_IP) are in `.env` (not committed).

VaultWarden has `ROCKET_TLS` configured (self-signed cert on port 8080), so Caddy proxies to it via `https://localhost:8080` with `tls_insecure_skip_verify`.

## Services Proxied

| Subdomain | Backend | Machine |
|-----------|---------|---------|
| home.<DOMAIN> | localhost:3000 | Pi (Homepage) |
| vault.<DOMAIN> | localhost:8080 | Pi (VaultWarden) |
| status.<DOMAIN> | localhost:3001 | Pi (Uptime Kuma) |
| pihole.<DOMAIN> | localhost:8088 | Pi (Pi-hole Admin) |
| photos.<DOMAIN> | Gaming PC:2283 | Gaming PC (Immich) |
| media.<DOMAIN> | Gaming PC:8096 | Gaming PC (Jellyfin) |
| chat.<DOMAIN> | Gaming PC:3080 | Gaming PC (Open WebUI) |
| grafana.<DOMAIN> | NAS:3030 | NAS (Grafana) |
| prometheus.<DOMAIN> | NAS:9090 | NAS (Prometheus) |

## Consequences

**Positive:**
- All services accessible via memorable `*.<DOMAIN>` URLs with valid HTTPS
- VaultWarden no longer shows browser security warning
- Watchtower can use `https://status.<DOMAIN>` for HTTPS notifications (unblocks ADR-007)
- Adding new services is trivial (one Caddyfile block, no DNS change)
- No ports exposed to the internet — fully LAN-scoped
- DNS failover works — NAS backup Pi-hole also has the wildcard rule

**Negative:**
- **IPv6 RA DNS conflict (significant):** Xfinity gateway injects Comcast IPv6 DNS via Router Advertisements to all LAN devices. These are queried before Pi-hole's IPv4 DNS, causing `*.<DOMAIN>` to return NXDOMAIN on most devices without manual DNS configuration. Network-wide fix requires bridge mode + own router. Per-device workaround: set DNS to VIP manually.
- Depends on community-maintained `caddybuilds/caddy-cloudflare` Docker image (building from source infeasible on Pi)
- Cloudflare API token is a new secret to manage
- Pi-hole admin moved to port 8088 — existing bookmarks need updating
- Changing service ports breaks Homepage widgets if not updated simultaneously (see RB-003)
