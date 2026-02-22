# Infrastructure

Network, power management, and security improvements.

## Network

- [ ] **Xfinity bridge mode + own router** — eliminates IPv6 RA DNS conflict that prevents `*.<DOMAIN>` from working without per-device DNS configuration (see ADR-031). Currently, Xfinity gateway injects Comcast IPv6 DNS via Router Advertisements, which most OSes query before Pi-hole.

## Power Management

- [ ] Configure Wake-on-LAN for Gaming PC
- [ ] Create scripts on Pi to wake PC on demand
- [ ] Consider: PC auto-wake for scheduled tasks, auto-sleep when idle
- [ ] **Power consumption tracking** — requires smart plug hardware (e.g., 3x TP-Link Kasa KP115 ~$15-20 each). Without smart plugs, true per-machine wattage cannot be measured: the Pi has no power sensors, the QNAP NAS (ARM TS-433) doesn't expose power metrics, and the Gaming PC's Intel RAPL only reports CPU package power (not total system). When ready, create a `power-exporter` proxy using `python-kasa` local API, following the existing proxy pattern.

## Security

- [ ] Implement at-rest encryption (potentially BitLocker for Gaming PC, QNAP volume encryption for NAS — especially important for personal documents in ADR-033)
- [ ] Audit Xfinity router open ports — check initial reference documents for which port was opened and whether it's still needed (close if not)
- [ ] MCP tool call Grafana dashboard: add breakdown for authorized vs unauthorized calls — Discord alert on unauthorized attempts (security monitoring)
- [ ] Verify Vaultwarden backup accessibility when Pi is down — can NAS backups be accessed directly without Pi-hole DNS?
  - Write up instructions for what to do when Pi is down, how can I recover the Vaultwarden backups? Step by step.
- [ ] Test iPhone DNS behavior off-network — with DNS set to <VIP>, does internet work when away from home and off VPN?
