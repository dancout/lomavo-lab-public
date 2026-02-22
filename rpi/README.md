# Raspberry Pi Configuration

Host: `<RPI_USER>@<RPI_IP>` (see `.env` for actual values)

## Services

### Running in Docker
| Service | Port | Description |
|---------|------|-------------|
| vaultwarden | 8080 | Bitwarden-compatible password manager |
| cloudflared-tunnel | - | Cloudflare tunnel for external access |
| homepage | 3000 | Dashboard for all homelab services |
| glances | 61208 | System monitor (CPU/RAM/disk/temp/network), powers Homepage widget |
| immich-jobs-proxy | 8085 | Aggregates Immich job queue counts for Homepage widget |
| paperless-stats-proxy | 8086 | Aggregates Paperless-ngx document count, storage, and task counts for Homepage widget |
| grafana-alerts-proxy | 8087 | Queries Grafana alert rules, returns firing/pending/normal counts for Homepage widget |
| glances-exporter | 9101 | Exports Glances metrics in Prometheus format |
| nest-exporter | 9102 | Exports Nest thermostat metrics in Prometheus format (ADR-028) |
| watchtower | - | Automatic container updates (daily at 3 AM), pushes heartbeat to Uptime Kuma |
| promtail | 9080 | Ships Docker logs to Loki on NAS (ADR-025) |
| caddy | 80, 443 | Reverse proxy with HTTPS for `*.<DOMAIN>` LAN services (ADR-031) |

### Running Natively
| Service | Port | Description |
|---------|------|-------------|
| Pi-hole | 53, 8088 | DNS server with ad blocking (web UI on 8088, moved from 80 for Caddy) |
| WireGuard | 51194 | VPN server (3 peers configured) |
| Keepalived | - | VRRP MASTER for Pi-hole HA VIP (<VIP>) |

## Directory Structure on Pi
```
/home/<RPI_USER>/
├── docker/
│   └── vaultwarden/
│       ├── docker-compose.yml
│       ├── vw-data/
│       └── ssl/
├── cloudflare/
│   └── docker-compose.yml
├── homepage/
│   ├── docker-compose.yml
│   └── config/
├── glances/
│   └── docker-compose.yml
├── immich-jobs-proxy/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── server.py
│   └── .env.example
├── paperless-stats-proxy/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── server.py
│   └── .env.example
├── grafana-alerts-proxy/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── server.py
│   └── .env.example
├── glances-exporter/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── server.py
├── nest-exporter/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── server.py
│   └── .env
├── watchtower/
│   └── docker-compose.yml
├── promtail/
│   ├── docker-compose.yml
│   └── promtail-config.yml
├── caddy/
│   ├── docker-compose.yml
│   ├── Caddyfile
│   └── .env
├── scripts/
│   └── wake-gaming-pc.sh         # Wake Gaming PC via magic packet (requires wakeonlan tool)
```

## Environment Variables
The following sensitive values are referenced in docker-compose files:
- `CLOUDFLARE_TUNNEL_TOKEN` - Used by cloudflared
- `UPTIME_KUMA_PUSH_TOKEN` - Used by Watchtower for push notifications (in `~/watchtower/.env`)
- `HOMEPAGE_VAR_IMMICH_API_KEY` - Used by Homepage for Immich stats widget (in `~/homepage/.env`)
- `HOMEPAGE_VAR_PIHOLE_API_KEY` - Used by Homepage for Pi-hole stats widgets (in `~/homepage/.env`, app password from Pi-hole UI — see ADR-024)
- `HOMEPAGE_VAR_DOMAIN` - Domain for HTTPS reverse proxy URLs in services.yaml, e.g. `grafana.{{HOMEPAGE_VAR_DOMAIN}}` (in `~/homepage/.env`)
- `IMMICH_JOBS_API_KEY` - Used by immich-jobs-proxy (in `~/immich-jobs-proxy/.env`)
- `PAPERLESS_URL` - Paperless-ngx server URL for paperless-stats-proxy (in `~/paperless-stats-proxy/.env`)
- `PAPERLESS_TOKEN` - Paperless-ngx API token for paperless-stats-proxy (in `~/paperless-stats-proxy/.env`)
- `IMMICH_STATS_API_KEY` - Immich API key with server.statistics permission for immich-jobs-proxy (in `~/immich-jobs-proxy/.env`)
- `GRAFANA_URL` - Grafana server URL for grafana-alerts-proxy (in `~/grafana-alerts-proxy/.env`)
- `SDM_PROJECT_ID` - Google SDM project ID for Nest API (in `~/nest-exporter/.env`)
- `GOOGLE_CLIENT_ID` - Google OAuth2 client ID (in `~/nest-exporter/.env`)
- `GOOGLE_CLIENT_SECRET` - Google OAuth2 client secret (in `~/nest-exporter/.env`)
- `GOOGLE_REFRESH_TOKEN` - Google OAuth2 refresh token (in `~/nest-exporter/.env`)
- `CLOUDFLARE_API_TOKEN` - Cloudflare API token with Zone:DNS:Edit permission (in `~/caddy/.env`)
- `DOMAIN` - Domain name for reverse proxy URLs (in `~/caddy/.env`)
- `GAMING_PC_IP` - Gaming PC IP for Caddy to proxy to (in `~/caddy/.env`)
- `NAS_IP` - NAS IP for Caddy to proxy to (in `~/caddy/.env`)

## Deployment

To deploy updated docker-compose files from this repo to the Pi:

```bash
# Copy compose files to Pi
scp rpi/docker/SERVICE/docker-compose.yml <RPI_USER>@<RPI_IP>:/home/<RPI_USER>/SERVICE/

# SSH in and restart the service
ssh <RPI_USER>@<RPI_IP> "cd /home/<RPI_USER>/SERVICE && docker compose down && docker compose up -d"
```

**Homepage config deployment** (includes services.yaml):
```bash
# Copy docker-compose and config directory
scp rpi/docker/homepage/docker-compose.yml <RPI_USER>@<RPI_IP>:/home/<RPI_USER>/homepage/
scp rpi/docker/homepage/config/services.yaml <RPI_USER>@<RPI_IP>:/home/<RPI_USER>/homepage/config/

# Note: services.yaml uses {{HOMEPAGE_VAR_*}} templating - ensure .env has the actual values
# IMPORTANT: Use "up -d" (not "restart") if .env has changed — restart reuses the
# existing container and does NOT re-read env files.
ssh <RPI_USER>@<RPI_IP> "cd /home/<RPI_USER>/homepage && docker compose up -d"
```

**Directory mapping:**
| Repo path | Pi path |
|-----------|---------|
| `rpi/docker/vaultwarden/` | `/home/<RPI_USER>/docker/vaultwarden/` |
| `rpi/docker/cloudflare/` | `/home/<RPI_USER>/cloudflare/` |
| `rpi/docker/homepage/` | `/home/<RPI_USER>/homepage/` |
| `rpi/docker/glances/` | `/home/<RPI_USER>/glances/` |
| `rpi/docker/immich-jobs-proxy/` | `/home/<RPI_USER>/immich-jobs-proxy/` |
| `rpi/docker/paperless-stats-proxy/` | `/home/<RPI_USER>/paperless-stats-proxy/` |
| `rpi/docker/grafana-alerts-proxy/` | `/home/<RPI_USER>/grafana-alerts-proxy/` |
| `rpi/docker/glances-exporter/` | `/home/<RPI_USER>/glances-exporter/` |
| `rpi/docker/nest-exporter/` | `/home/<RPI_USER>/nest-exporter/` |
| `rpi/docker/watchtower/` | `/home/<RPI_USER>/watchtower/` |
| `rpi/docker/promtail/` | `/home/<RPI_USER>/promtail/` |
| `rpi/docker/caddy/` | `/home/<RPI_USER>/caddy/` |

**Note:** The Pi has `.env` files in each service directory with actual secrets. These are NOT in version control - only `.env.example` templates are tracked.

## Network Mounts

| Mount Point | Remote Share | Purpose |
|-------------|--------------|---------|
| `/home/<RPI_USER>/pc_storage` | `//<GAMING_PC_IP>/Server_Data` | Gaming PC shared storage |
| `/home/<RPI_USER>/nas_backups` | `//<NAS_IP>/Backups` | VaultWarden backups (ADR-013) |

Credentials stored in `~/.smbcredentials` (Gaming PC) and `~/.nas_smbcredentials` (NAS).

## VaultWarden Backups

Daily automated backups via cron (2 AM):
- Script: `/home/<RPI_USER>/backup_vault.sh`
- Source: `/home/<RPI_USER>/docker/vaultwarden/vw-data`
- Destination: `/home/<RPI_USER>/nas_backups/` (NAS, RAID 5 protected)
- Retention: 30 days

## Homepage Templating

Homepage's `services.yaml` is tracked in version control with secrets handled via environment variable templating:

1. **Secrets in `.env`**: API keys and passwords go in `~/homepage/.env` (not in repo)
2. **Templating syntax**: Use `{{HOMEPAGE_VAR_NAME}}` in `services.yaml` to reference variables
3. **docker-compose**: Must include `env_file: .env` to pass variables into the container
4. **Prefix required**: Only variables prefixed with `HOMEPAGE_VAR_` are available for templating

Example flow:
```
.env:                    HOMEPAGE_VAR_IMMICH_API_KEY=abc123
services.yaml:           key: {{HOMEPAGE_VAR_IMMICH_API_KEY}}
At runtime:              key: abc123
```

## Keepalived (VRRP Master)

Keepalived runs natively on the Pi as the MASTER (priority 150) for the Pi-hole HA VIP:

- **Config:** `/etc/keepalived/keepalived.conf`
- **Health check:** `/etc/keepalived/check_pihole.sh` — queries `dig @127.0.0.1 google.com` every 2s
- **VIP:** <VIP>/24 on eth0 (secondary address)
- **Peer:** NAS (`<NAS_IP>`) as BACKUP (priority 100)
- **VRRP mode:** Unicast

```bash
# Check status
sudo systemctl status keepalived
# Check VIP assignment
ip addr show eth0 | grep <VIP>
# View logs
sudo journalctl -u keepalived -f
```

Repo config: `rpi/keepalived/` (uses placeholders — actual IPs deployed on Pi)

## Notes
- Pi-hole, WireGuard, and Keepalived run natively, not in Docker
- Homepage has access to Docker socket for container status
- Watchtower auto-updates containers daily at 3 AM (cron schedule), pushes heartbeat to Uptime Kuma
- Vaultwarden has signups disabled and uses TLS with local certificates
- Gaming PC storage mounted at `/home/<RPI_USER>/pc_storage` (do not delete)
- Cgroup memory enabled in `/boot/firmware/cmdline.txt` for container memory metrics (required for Glances to report container memory usage)
