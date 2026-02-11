# NAS Configuration

**Device:** QNAP TS-433
**Host:** `<NAS_IP>` (see `.env.local` for actual value)
**OS:** QTS 5.2
**Access:** Web UI at `http://<NAS_IP>:8080`, SMB at `smb://<NAS_IP>`

## Hardware

- **CPU:** ARM Cortex-A55 quad-core 2.0GHz (Rockchip RK3568)
- **RAM:** 4GB (non-expandable)
- **Drives:** 3x Seagate Ironwolf 4TB in RAID 5
- **Network:** 2.5GbE port (in use), 1GbE port (available)
- **NPU:** 0.8 TOPS (for AI-powered features)

## Storage Configuration

| Component | Details |
|-----------|---------|
| Storage Pool 1 | RAID 5, 3 drives, ~7.28TB raw |
| Snapshot Space | 20% reserved |
| DataVol1 | Thick volume, ~5.8TB usable |

## Shared Folders

| Folder | Purpose | Access |
|--------|---------|--------|
| Public | Default QNAP folder | <NAS_USER>: RW |
| Media | Jellyfin/Immich media storage | <NAS_USER>: RW |
| Logs | Centralized logging from all devices | <NAS_USER>: RW |

## Network Settings

- **IP:** `<NAS_IP>` (static)
- **Subnet:** 255.255.255.0
- **Gateway:** `<ROUTER_IP>`
- **Primary DNS:** `<RPI_IP>` (Pi-hole)
- **Secondary DNS:** 8.8.8.8

## Services Enabled

- **SMB/CIFS:** Enabled (Windows/Mac file sharing)
- **NTP:** Enabled (automatic time sync)
- **Firmware Updates:** Notify only, no auto-update

## Connecting from Devices

**Mac/Windows:**
```
smb://<NAS_IP>
```
Or in Finder: `Cmd+K` → `smb://<NAS_IP>`

**Linux (including Raspberry Pi):**
```bash
# Mount temporarily
sudo mount -t cifs //<NAS_IP>/Media /mnt/nas-media -o username=<NAS_USER>

# Or add to /etc/fstab for persistent mount
//<NAS_IP>/Media /mnt/nas-media cifs credentials=/home/user/.nas-credentials,uid=1000,gid=1000 0 0
```

## Initial Setup Decisions

See **ADR-008** for detailed decision rationale covering:
- RAID 5 for all storage (including logs)
- Thick volume vs thin
- Snapshot space allocation
- Why not partition non-RAID space for logs

## Running Containers

| Container | Image | Purpose |
|-----------|-------|---------|
| sysctl-init | alpine:latest | Sets ip_nonlocal_bind for VIP binding (runs once at startup) |
| pihole | pihole/pihole:latest | Backup DNS server (ad blocking) |
| nebula-sync | ghcr.io/lovelaze/nebula-sync:latest | Syncs blocklists from primary Pi-hole |
| keepalived | shawly/keepalived:latest | VRRP BACKUP for Pi-hole HA VIP (<VIP>) |
| glances | nicolargo/glances:latest-full | System monitoring |
| glances-exporter | glances-exporter (custom) | Exports Glances metrics in Prometheus format |
| prometheus | prom/prometheus:latest | Time-series metrics storage & scraping |
| grafana | grafana/grafana:latest | Dashboards, alerting, log viewer |
| loki | grafana/loki:latest | Log aggregation |
| promtail | grafana/promtail:latest | Ships NAS Docker logs to Loki |

Config location: `/share/CACHEDEV1_DATA/docker/<service>/`
Docker command: `DOCKER_HOST=unix:///var/run/system-docker.sock docker compose ...`
Docker binary: `/share/CACHEDEV1_DATA/.qpkg/container-station/bin/docker`

### Pi-hole (Backup DNS)

- **Web UI:** `http://<NAS_IP>:8089/admin`
- **DNS:** `<NAS_IP>:53`
- **Upstream:** 8.8.8.8, 8.8.4.4 (Google — NOT primary Pi-hole, to avoid circular dependency)
- **Sync:** nebula-sync pulls blocklists/settings from primary Pi-hole (Pi) every 2 hours
- **Password:** Same as primary Pi-hole, stored in `/share/CACHEDEV1_DATA/docker/pihole/.env`
- **Port 53 note:** Binds only to `<NAS_IP>`:53 to avoid conflict with QNAP's internal DNS on container network interfaces

### Deploy/Restart Pi-hole

```bash
# From repo root
scp nas/docker/pihole/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/pihole/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/pihole && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

### Keepalived (VRRP Backup)

- **Role:** BACKUP (priority 100) — takes over VIP <VIP> when Pi is down
- **Config:** `/share/CACHEDEV1_DATA/docker/keepalived/`
- **Health check:** `nslookup google.com <NAS_IP>` every 2s
- **Note:** `check_pihole.sh` must be owned by root (UID 0) for `enable_script_security`

### Deploy/Restart Keepalived

```bash
scp nas/docker/keepalived/docker-compose.yml nas/docker/keepalived/keepalived.conf nas/docker/keepalived/check_pihole.sh <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/keepalived/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/keepalived && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

### ip_nonlocal_bind Persistence

QNAP has no persistent sysctl config. The `sysctl-init` container in the Pi-hole compose sets `net.ipv4.ip_nonlocal_bind=1` on every startup via `nsenter`. This allows Pi-hole to bind to the VIP (<VIP>) even when Keepalived hasn't assigned it yet.

### Prometheus

- **Web UI:** `http://<NAS_IP>:9090`
- **Retention:** 120 days
- **Scrape targets:** metrics-endpoint (`<GAMING_PC_IP>:61209/metrics`), immich-jobs-proxy (`<RPI_IP>:8085/metrics`), glances-exporter Pi (`<RPI_IP>:9101/metrics`), glances-exporter NAS (`<NAS_IP>:9101/metrics`)
- **Config:** `/share/CACHEDEV1_DATA/docker/prometheus/prometheus.yml`

### Deploy/Restart Prometheus

```bash
scp nas/docker/prometheus/docker-compose.yml nas/docker/prometheus/prometheus.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/prometheus/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/prometheus && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

### Grafana

- **Web UI:** `http://<NAS_IP>:3030` (admin / password in `.env`)
- **Datasources:** Prometheus (auto-provisioned), Loki (auto-provisioned)
- **Dashboards:** Homelab Overview (all 3 machines), Immich Jobs & Hardware, Container Logs
- **Alerting:** 10 alert rules via Discord webhook — covers all 3 machines (ADR-025)

### Deploy/Restart Grafana

```bash
scp nas/docker/grafana/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/grafana/
scp nas/docker/grafana/provisioning/datasources/datasources.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/grafana/provisioning/datasources/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/grafana && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

### Loki + Promtail (Logs)

- **Loki API:** `http://<NAS_IP>:3100`
- **Retention:** 120 days
- **Promtail:** Discovers and ships all NAS Docker container logs to Loki

### Deploy/Restart Loki

```bash
scp nas/docker/loki/docker-compose.yml nas/docker/loki/loki-config.yml nas/docker/loki/promtail-config.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/loki/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/loki && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

## Future Considerations

- [ ] Configure as backup destination (Time Machine, PC backups)
- [ ] Migrate Immich storage from Gaming PC
- [x] Set up Grafana/Loki log destination (ADR-025)
- [x] Gaming PC Promtail (deployed from console)
- [x] Glances Prometheus exporter (custom Python exporter scraping Glances REST API)
