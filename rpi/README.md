# Raspberry Pi Configuration

Host: `<RPI_USER>@<RPI_IP>` (see `.env.local` for actual values)

## Services

### Running in Docker
| Service | Port | Description |
|---------|------|-------------|
| uptime-kuma | 3001 | Status monitoring dashboard (exposed via Cloudflare tunnel at `<STATUS_URL>`) |
| vaultwarden | 8080 | Bitwarden-compatible password manager |
| cloudflared-tunnel | - | Cloudflare tunnel for external access |
| homepage | 3000 | Dashboard for all homelab services |
| glances | 61208 | System monitor (CPU/RAM/disk/temp/network), powers Homepage widget |
| immich-jobs-proxy | 8085 | Aggregates Immich job queue counts for Homepage widget |
| glances-exporter | 9101 | Exports Glances metrics in Prometheus format |
| watchtower | - | Automatic container updates (daily) |
| promtail | 9080 | Ships Docker logs to Loki on NAS (ADR-025) |

### Running Natively
| Service | Port | Description |
|---------|------|-------------|
| Pi-hole | 53 | DNS server with ad blocking |
| WireGuard | 51194 | VPN server (3 peers configured) |
| Keepalived | - | VRRP MASTER for Pi-hole HA VIP (<VIP>) |

## Directory Structure on Pi
```
/home/<RPI_USER>/
├── docker/
│   ├── uptime-kuma/
│   │   ├── docker-compose.yml
│   │   └── data/
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
│   └── server.py
├── glances-exporter/
│   ├── docker-compose.yml
│   ├── Dockerfile
│   └── server.py
├── watchtower/
│   └── docker-compose.yml
└── promtail/
    ├── docker-compose.yml
    └── promtail-config.yml
```

## Environment Variables
The following sensitive values are referenced in docker-compose files:
- `CLOUDFLARE_TUNNEL_TOKEN` - Used by cloudflared and uptime-kuma
- `HOMEPAGE_VAR_IMMICH_API_KEY` - Used by Homepage for Immich stats widget (in `~/homepage/.env`)
- `HOMEPAGE_VAR_PIHOLE_API_KEY` - Used by Homepage for Pi-hole stats widgets (in `~/homepage/.env`, app password from Pi-hole UI — see ADR-024)
- `IMMICH_JOBS_API_KEY` - Used by immich-jobs-proxy (in `~/immich-jobs-proxy/.env`)

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
ssh <RPI_USER>@<RPI_IP> "cd /home/<RPI_USER>/homepage && docker compose restart"
```

**Directory mapping:**
| Repo path | Pi path |
|-----------|---------|
| `rpi/docker/uptime-kuma/` | `/home/<RPI_USER>/docker/uptime-kuma/` |
| `rpi/docker/vaultwarden/` | `/home/<RPI_USER>/docker/vaultwarden/` |
| `rpi/docker/cloudflare/` | `/home/<RPI_USER>/cloudflare/` |
| `rpi/docker/homepage/` | `/home/<RPI_USER>/homepage/` |
| `rpi/docker/glances/` | `/home/<RPI_USER>/glances/` |
| `rpi/docker/immich-jobs-proxy/` | `/home/<RPI_USER>/immich-jobs-proxy/` |
| `rpi/docker/glances-exporter/` | `/home/<RPI_USER>/glances-exporter/` |
| `rpi/docker/watchtower/` | `/home/<RPI_USER>/watchtower/` |
| `rpi/docker/promtail/` | `/home/<RPI_USER>/promtail/` |

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
- Watchtower polls for updates every 24 hours (86400 seconds)
- Vaultwarden has signups disabled and uses TLS with local certificates
- Gaming PC storage mounted at `/home/<RPI_USER>/pc_storage` (do not delete)
- Cgroup memory enabled in `/boot/firmware/cmdline.txt` for container memory metrics (required for Glances to report container memory usage)
