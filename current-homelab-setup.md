Current homelab setup:
- I have a raspberry pi running VaultWarden, a WireGuard VPN, homepage, pi-hole, watchtower, and uptime kuma. This is directly linked to the router via Ethernet.
- I have a gaming PC with i7 CPU and GTX 1050Ti GPU and 2TB of storage (1TB local SSD and 1TB HDD Currently set up as network drive available to other machines) running watchtower, JellyFin, and Immich. This is connected to WiFi over a USB adapter.
- I have a NAS QNAP TS-433 with 3 Seagate Ironwolf drives that are each 4TB of space that will be using RAID 5 storage (for around 9TB of total storage). This is not yet unboxed.
- I have a TrendNet 5 port unmanaged 2.5g switch that is not yet unboxed.
- I own the domain `<DOMAIN>` (see `.env` for actual value)
- I have a cloud flare account and have created a tunnel for `<STATUS_URL>` to point to a local status dashboard from uptime kuma (publicly available).
- I have a digital ocean account and am renting a small VPS where I use tail scale to connect my gaming PC to the public web, and I have pointed `<PHOTOS_URL>` to my locally running immich instance so it is publicly reachable. My wife and I each have an account and have been backing up data (roughly 300GB) so far using the external link so it's available anywhere
- I have my phone setup so that when it is off my home network that it automatically VPNs through wireguard into my home network via my raspberry pi.