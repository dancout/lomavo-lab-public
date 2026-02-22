# DNS Lessons Learned

Hard-won knowledge about DNS behavior in a homelab environment.

## IPv6 Router Advertisement DNS Injection

**Problem (2026-02):** Consumer ISP gateways can send IPv6 Router Advertisements containing DNS server addresses (RDNSS option). These are multicast to ALL devices on the network and bypass DHCP entirely. Most operating systems prioritize IPv6 DNS over IPv4 DNS.

**Impact:** Even when Pi-hole DHCP advertises itself as the DNS server, devices query the ISP's DNS first via IPv6 RA. Custom local DNS records (e.g., `*.yourdomain.com`) return NXDOMAIN because the ISP DNS doesn't know about them.

**Key lesson:** When planning DNS-dependent features, always verify actual device resolver behavior. Don't assume DHCP DNS = only DNS. IPv6 RAs inject DNS independently of DHCP.

**Workarounds:**
- Per-device: Manually set DNS server in device network settings (overrides RA)
- Permanent: ISP gateway bridge mode + own router (eliminates competing DNS advertisements)

**Windows-specific:** `Set-DnsClientServerAddress` does NOT clear IPv6 RDNSS from Router Advertisements. Must use `netsh interface ipv6 set interface "NAME" rabaseddnsconfig=disable` and disable DHCPv6 separately. Re-enabling DHCPv6 brings back the RA DNS entries.

See ADR-031 for the full decision record.
