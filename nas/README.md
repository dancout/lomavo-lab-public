# NAS Configuration

**Device:** QNAP TS-433
**Host:** `<NAS_IP>` (see `.env` for actual value)
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
| glances | nicolargo/glances:latest-full | System monitoring (custom config disables heavy plugins) |
| glances-exporter | glances-exporter (custom) | Exports Glances metrics in Prometheus format (cpu, mem, load, fs, network, sensors, folders) |
| prometheus | prom/prometheus:latest | Time-series metrics storage & scraping |
| grafana | grafana/grafana:latest | Dashboards, alerting, log viewer |
| loki | grafana/loki:latest | Log aggregation |
| uptime-kuma | louislam/uptime-kuma:1 | Status monitoring dashboard (<STATUS_URL> via Caddy on Pi) |
| promtail | grafana/promtail:latest | Ships NAS Docker logs to Loki |

Config location: `/share/CACHEDEV1_DATA/docker/<service>/`
Docker command: `DOCKER_HOST=unix:///var/run/system-docker.sock docker compose ...`
Docker binary: `/share/CACHEDEV1_DATA/.qpkg/container-station/bin/docker`

### Pi-hole (Backup DNS)

- **Web UI:** `http://<NAS_IP>:8089/admin`
- **DNS:** `<NAS_IP>:53`
- **Upstream:** 8.8.8.8, 8.8.4.4 (Google — NOT primary Pi-hole, to avoid circular dependency)
- **Sync:** nebula-sync pulls blocklists/settings from primary Pi-hole (Pi, port 8088) every 2 hours
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
- **Scrape targets:** metrics-endpoint, immich-jobs, glances-rpi, glances-nas, nest-thermostat, qdrant, paperless-stats, grafana-alerts
- **Config:** `/share/CACHEDEV1_DATA/docker/prometheus/prometheus.yml`
- **Template:** `prometheus.yml` in the repo uses `${VAR}` placeholders — must be resolved via `deploy.sh` before deploying (ADR-036)

### Deploy/Restart Prometheus

**Config with variable substitution (recommended):**
```bash
# Run from deployment node (MacBook or any Unix system with envsubst + SSH/SCP access to NAS)
./nas/docker/prometheus/deploy.sh
```

**Note:** `deploy.sh` runs on the deployment node (currently MacBook) to resolve variables from `.env` before deploying to NAS. It uses `envsubst` (standard Unix tool, no project dependencies). If not available, the script provides install instructions. Can be run from any Unix system or container with NAS network access.

**Docker-compose only (no variable substitution):**
```bash
scp nas/docker/prometheus/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/prometheus/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/prometheus && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

**WARNING:** Do NOT SCP `prometheus.yml` directly from the repo — it contains `${VAR}` placeholders that must be resolved first. Always use `deploy.sh`.

### Grafana

- **Web UI:** `https://grafana.<DOMAIN>` (via Caddy reverse proxy) or `http://<NAS_IP>:3030` (direct)
- **Root URL:** `GF_SERVER_ROOT_URL=https://grafana.${DOMAIN}/` (set via `DOMAIN` in `.env`, must match reverse proxy URL for correct asset/redirect paths)
- **Embedding:** Anonymous access enabled for Homepage iframe widgets (`GF_SECURITY_ALLOW_EMBEDDING=true`, `GF_AUTH_ANONYMOUS_ENABLED=true`)
- **Datasources:** Prometheus (auto-provisioned), Loki (auto-provisioned)
- **Dashboards:** 6 dashboards, file-provisioned from `provisioning/dashboards/*.json` (read-only in UI, ADR-030)
- **Alerting:** 15 alert rules via Discord webhook — covers all 3 machines (ADR-025)
- **Alert provisioning:** Rules are file-provisioned from `provisioning/alerting/alerts.yml` (read-only in UI)

### Deploy/Restart Grafana

```bash
scp nas/docker/grafana/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/grafana/
scp nas/docker/grafana/provisioning/datasources/datasources.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/grafana/provisioning/datasources/
scp nas/docker/grafana/provisioning/alerting/alerts.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/grafana/provisioning/alerting/
scp nas/docker/grafana/provisioning/dashboards/dashboards.yml nas/docker/grafana/provisioning/dashboards/*.json <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/grafana/provisioning/dashboards/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/grafana && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
```

**Alert rules** and **dashboards** are file-provisioned — edit files in `provisioning/` in the repo, SCP to NAS, and restart Grafana. Both will appear as read-only in the Grafana UI.

### Glances + Exporter

- **Web UI:** `http://<NAS_IP>:61208`
- **Exporter:** `http://<NAS_IP>:9101/metrics` (Prometheus format)
- **Config:** `glances.conf` — disables `processlist` and `programlist` plugins to reduce CPU (~40% → ~2% on ARM). Refresh interval set to 5s.
- **Folders plugin:** Monitors data directory sizes for Prometheus, Loki, Grafana, and Pi-hole. Sizes exported as `glances_folder_size_bytes` metric and displayed on Homepage "Service Data" widget.

### Deploy/Restart Glances

```bash
scp nas/docker/glances/docker-compose.yml nas/docker/glances/glances.conf <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/glances/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/glances && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose up -d"
```

To update the glances-exporter (requires rebuilding on Pi since QNAP can't build images):
```bash
# Build on Pi
scp nas/docker/glances-exporter/server.py nas/docker/glances-exporter/Dockerfile <RPI_USER>@<RPI_IP>:/tmp/glances-exporter-build/
ssh <RPI_USER>@<RPI_IP> "cd /tmp/glances-exporter-build && docker build -t glances-exporter-glances-exporter:latest . && docker save glances-exporter-glances-exporter:latest | gzip > /tmp/glances-exporter.tar.gz"

# Transfer and load on NAS
scp <RPI_USER>@<RPI_IP>:/tmp/glances-exporter.tar.gz /tmp/ && scp /tmp/glances-exporter.tar.gz <NAS_USER>@<NAS_IP>:/tmp/
ssh <NAS_USER>@<NAS_IP> "export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && gunzip -c /tmp/glances-exporter.tar.gz | DOCKER_HOST=unix:///var/run/system-docker.sock docker load"
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/glances-exporter && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose up -d"
```

### Uptime Kuma

- **Web UI:** `https://status.<DOMAIN>` (via Caddy reverse proxy on Pi) or `http://<NAS_IP>:3001` (direct)
- **Data:** `/share/CACHEDEV1_DATA/docker/uptime-kuma/data/` (SQLite DB, ~139MB)
- **Networking:** Host mode (port 3001)
- **Note:** Migrated from Pi to NAS to relieve Pi memory pressure

### Deploy/Restart Uptime Kuma

```bash
scp nas/docker/uptime-kuma/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/uptime-kuma/
ssh <NAS_USER>@<NAS_IP> "cd /share/CACHEDEV1_DATA/docker/uptime-kuma && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose down && docker compose up -d"
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
