# Gaming PC Configuration

Host: `<GAMING_PC_IP>` (Ethernet via TrendNet switch)
SSH: `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>` (note: username may require quotes if it has spaces)

See `.env` for actual IPs and usernames.

## Services

### Running in Docker
| Service | Port | Description |
|---------|------|-------------|
| immich_server | 2283 | Photo/video backup (exposed via Tailscale at `<PHOTOS_URL>`) |
| immich_postgres | - | PostgreSQL database for Immich |
| immich_redis | - | Redis cache for Immich |
| immich_machine_learning | - | ML processing for Immich |
| jellyfin | 8096 | Media server |
| glances | 61208 | System monitor (CPU/RAM/Storage), powers Homepage widget |
| ollama | 11434 | Local LLM serving, CPU-only (ADR-026) |
| open-webui | 3080 | Chat interface for Ollama (ADR-026) |
| mcp-homelab | 8770 | MCP server: repo/docs access (ADR-027) |
| mcp-monitoring | 8771 | MCP server: Prometheus/Grafana/Loki queries (ADR-027) |
| mcp-immich | 8772 | MCP server: photo search, albums, job control (ADR-027) |
| mcp-dns | 8773 | MCP server: Pi-hole stats, blocking, query log (ADR-027) |
| mcp-docker | 8774 | MCP server: container management via socket + SSH (ADR-027) |
| paperless-ngx | 8776 | Document management, OCR, tagging, web UI (ADR-033) |
| paperless-postgres | - | PostgreSQL for Paperless metadata |
| paperless-redis | - | Redis for Paperless task queue |
| qdrant | - | Vector database for semantic search (internal only, ADR-033) |
| mcp-documents | 8775 | MCP server: document search, sync, ingestion (ADR-033) |
| promtail | 9080 | Ships Gaming PC Docker logs to Loki on NAS (ADR-025) |
| watchtower | - | Auto-updates containers daily at 3 AM, pushes heartbeat to Uptime Kuma |

### Native Windows Services
| Service | Port | Description |
|---------|------|-------------|
| metrics-endpoint | 61209 | Windows host metrics (CPU/RAM/disk/temp/network) - JSON at `/`, Prometheus at `/metrics` - see ADR-012, ADR-016, ADR-019, ADR-025 |
| LibreHardwareMonitor | 8085 | Hardware sensor data (temperatures) - see `docs/librehardwaremonitor-setup.md` |

### Hardware
- i7 CPU
- GTX 1050Ti GPU (4GB VRAM) - used for NVENC transcoding
- 32GB RAM
- C: drive - 1TB SSD (Immich: DB, thumbnails, config - see ADR-011)
- D: drive - 1TB HDD (Jellyfin config/media)

## Directory Structure on Gaming PC

```
C:\Server_Data\Docker\immich\       # All Immich on SSD (ADR-011)
├── docker-compose.yml
├── .env
├── hwaccel.transcoding.yml
├── immich_db_backup.sql
├── model-cache\
├── postgres\                       # Database
└── thumbs\                         # Thumbnails

C:\Server_Data\Docker\glances\     # Container monitoring
└── docker-compose.yml

C:\Server_Data\Scripts\            # Native Windows scripts
└── metrics-endpoint.ps1           # Host metrics endpoint (ADR-012)

C:\Program Files\LibreHardwareMonitor\  # Temperature monitoring (ADR-016)
└── LibreHardwareMonitor.exe            # Must be running for temps

C:\Users\<GAMING_PC_USER>\Documents\Projects\lomavo-lab\  # Repo clone
└── mcp-servers\                   # MCP server source + docker-compose
    ├── docker-compose.yml         # All 5 MCP servers
    ├── Dockerfile
    ├── .env                       # Machine IPs, API keys, service URLs
    └── src\                       # TypeScript source (homelab, monitoring, immich, dns, docker)

C:\Server_Data\Docker\documents\    # Document management + vector search (ADR-033)
├── docker-compose.yml
├── .env
└── (volumes managed by Docker)     # pgdata, qdrant-data, paperless-data

D:\Server_Data\
├── Docker\
│   └── watchtower\
│       ├── docker-compose.yml
│       └── .env                       # UPTIME_KUMA_PUSH_TOKEN
├── docker-compose.yml              # Jellyfin
├── Jellyfin_Config\
├── Jellyfin_Cache\
└── Media\                          # Jellyfin media library
```

**Note:** Immich photo/video originals are on NAS via CIFS volume (ADR-009).

## Network Shares

| Share Name | Local Path | Used By |
|------------|------------|---------|
| `Server_Data` | `D:\` | Raspberry Pi mounts at `/home/<RPI_USER>/pc_storage` |

## Environment Variables

See `.env.example` for required variables. Key secrets:
- `DB_PASSWORD` - Immich PostgreSQL password
- `UPTIME_KUMA_PUSH_TOKEN` - Watchtower push notification token
- `PAPERLESS_DB_PASSWORD`, `PAPERLESS_SECRET_KEY`, `PAPERLESS_ADMIN_PASSWORD` - Paperless-ngx (in `documents/.env`)
- `QDRANT_API_KEY` - Qdrant vector database (in `documents/.env`)
- `MCP_API_KEY` - Bearer token for all MCP servers (in `mcp-servers/.env`)

## Known Issues

### pc_storage Mount Investigation
The Raspberry Pi has this PC's `Server_Data` share mounted at `/home/<RPI_USER>/pc_storage`. Contains Immich library data (~626GB). **Status: Needs investigation** - unclear if actively used or experimental. See `plans/ideas-and-backlog.md`.

## Deployment

To deploy updated docker-compose files from this repo to the Gaming PC:

```bash
# Copy compose file (note: scp doesn't work with spaces in username, use ssh+type instead)
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "type" < gaming-pc/docker/SERVICE/docker-compose.yml > temp.yml
# Then manually copy temp.yml content

# Or use the Windows SSH session directly:
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>
# Then edit files with notepad or other tools
```

**Directory mapping:**
| Repo path | Gaming PC path |
|-----------|----------------|
| `gaming-pc/docker/immich/` | `C:\Server_Data\Docker\immich\` |
| `gaming-pc/docker/glances/` | `C:\Server_Data\Docker\glances\` |
| `gaming-pc/docker/watchtower/` | `D:\Server_Data\Docker\watchtower\` |
| `gaming-pc/docker/jellyfin/` | `D:\Server_Data\` |
| `gaming-pc/scripts/` | `C:\Server_Data\Scripts\` |
| `gaming-pc/docs/` | (documentation only, not deployed) |
| `gaming-pc/docker/promtail/` | `C:\Server_Data\Docker\promtail\` |
| `gaming-pc/docker/ollama/` | `C:\Server_Data\Docker\ollama\` |
| `gaming-pc/docker/open-webui/` | `C:\Server_Data\Docker\open-webui\` |
| `gaming-pc/docker/documents/` | `C:\Server_Data\Docker\documents\` |
| `mcp-servers/` | Runs from repo clone (builds Docker image in-place) |

## Updating Services Manually

Watchtower auto-updates containers daily at 3 AM. To update immediately:

```cmd
cd C:\Server_Data\Docker\immich
docker compose pull
docker compose up -d
```

**Note:** `docker compose pull` may fail over SSH due to Windows credential helper. Run directly on the Gaming PC console, or see Docker config fix below.

### Docker SSH Credential Fix

Docker Desktop's credential helper (`credsStore: desktop`) doesn't work over SSH. To enable SSH-based pulls, edit `C:\Users\<GAMING_PC_USER>\.docker\config.json` and remove the `credsStore` line:

```json
{
  "auths": {},
  "currentContext": "desktop-linux"
}
```

This allows anonymous pulls from public registries (ghcr.io, Docker Hub) over SSH.

## Host Metrics Endpoint Setup

The metrics endpoint (`metrics-endpoint.ps1`) provides Windows host CPU/RAM/disk stats on port 61209. See ADR-012 for decision context.

**Features:**
- Exposes CPU, RAM, disk, network, and temperature metrics as JSON
- Auto-restart on crash (30 second delay) - no manual intervention needed
- Temperatures require LibreHardwareMonitor running (see below)

### Setup via Task Scheduler (runs at boot, before login)

1. Open Task Scheduler (`taskschd.msc`)
2. Create Task (not Basic Task):
   - **General tab:**
     - Name: `Metrics Endpoint`
     - Run whether user is logged on or not
     - Run with highest privileges
   - **Triggers tab:**
     - New → At startup
   - **Actions tab:**
     - New → Start a program
     - Program: `powershell.exe`
     - Arguments: `-ExecutionPolicy Bypass -File "C:\Server_Data\Scripts\metrics-endpoint.ps1"`
   - **Conditions tab:**
     - Uncheck "Start only if on AC power"
   - **Settings tab:**
     - Check "Run task as soon as possible after a scheduled start is missed"
     - Set "Stop the task if it runs longer than" to **disabled** (or via PowerShell: `ExecutionTimeLimit = "PT0S"`). The default 72-hour limit will silently kill long-running tasks. See [RB-001](../runbooks/RB-001-metrics-endpoint-72h-limit.md).

3. Enter admin password when prompted

4. Add firewall rule (run as admin):
   ```cmd
   netsh advfirewall firewall add rule name="Metrics Endpoint" dir=in action=allow protocol=tcp localport=61209
   ```

5. Test: `curl http://<GAMING_PC_IP>:61209/`

### Response Format
```json
{
  "timestamp": "2026-01-30T12:00:00.000-08:00",
  "cpu": { "percent": 15.5 },
  "memory": { "usedGB": 12.5, "totalGB": 32.0, "percent": 39.1 },
  "disks": {
    "C": { "usedGB": 150.2, "totalGB": 931.5, "percent": 16.1 },
    "D": { "usedGB": 500.0, "totalGB": 931.5, "percent": 53.7 }
  },
  "network": {
    "Ethernet": { "bytesRecvPerSec": 1024, "bytesSentPerSec": 512 },
    "Tailscale": { "bytesRecvPerSec": 256, "bytesSentPerSec": 128 },
    "WSL": { "bytesRecvPerSec": 0, "bytesSentPerSec": 0 }
  },
  "temperatures": {
    "CPU_Package": 45.0,
    "GPU_Hot_Spot": 38.0
  }
}
```

**Notes:**
- Disk keys use "C" and "D" (not "C:" and "D:") for Homepage widget compatibility
- Temperatures require LibreHardwareMonitor running with web server enabled (port 8085)
- Network stats use .NET NetworkInterface API to include Tailscale (see ADR-019)
- First request after service restart shows 0 bytes/sec (no previous data for rate calculation)

## Wake-on-LAN (WoL)

The Gaming PC can be woken remotely via magic packet from the Raspberry Pi. All services start automatically on boot (Docker via auto-login, ADR-015).

### Current State

- **NIC:** Intel Ethernet Connection (7) I219-V (`Ethernet 2`)
- **MAC:** `00:D8:61:9D:50:7B` (also in `.env` as `GAMING_PC_MAC`)
- **Wake on Magic Packet:** Enabled (was already default)
- **Fast Startup:** Disabled (`powercfg /h off`) — required for WoL from full shutdown
- **BIOS:** Must be enabled manually for WoL from full shutdown (see below)

### Wake the PC from Pi

```bash
# On the Pi — env vars can be inline or sourced from ~/.env
GAMING_PC_MAC=00:D8:61:9D:50:7B GAMING_PC_IP=10.0.0.32 ~/scripts/wake-gaming-pc.sh

# Or from this repo's .env on the Pi:
set -a && source ~/.env && set +a && ~/scripts/wake-gaming-pc.sh
```

The script sends a magic packet to the broadcast address (`10.0.0.255:9`) and polls until the PC responds to ping (max 90s, configurable).

### WoL from Sleep vs Full Shutdown

| State | Requires BIOS setting? | Works now? |
|-------|----------------------|------------|
| Sleep (S3) | No | Yes |
| Full shutdown | Yes | Only after BIOS step below |

### BIOS Setup (one-time, manual)

Required for WoL to work from a full shutdown (not just sleep):

1. Reboot → enter BIOS/UEFI (Del or F2 at POST)
2. Find **"Wake on LAN"** / **"Power On By PCI-E LAN"** / **"ErP Ready"** → set to **Enabled** / **Disabled** (ErP must be *disabled* to allow WoL)
3. Save and boot

### Re-enabling Fast Startup (if needed)

Fast Startup is disabled to allow WoL from shutdown. If you need to re-enable it:

```powershell
powercfg /h on
```

Note: re-enabling will break WoL from full shutdown.

## Auto-Login Configuration (ADR-015)

Docker Desktop requires a user login to start. To ensure Docker services start automatically after reboot:

**Configuration:**
- Auto-login enabled via registry (`HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon`)
- Scheduled task "Lock on Login" immediately locks screen after auto-login
- Docker Desktop starts normally, then screen locks

**Behavior after reboot:**
1. Windows boots → auto-logs in as `<GAMING_PC_USER>`
2. Docker Desktop starts (configured in registry Run key)
3. Screen locks immediately
4. Docker containers (Immich, Jellyfin, Glances) are running

**Security note:** Password is stored in plaintext in registry. Use a unique password for this account. See ADR-015 for full security discussion.

**To modify or disable:**
```cmd
# Disable auto-login
reg delete "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /f

# Remove the lock task
schtasks /delete /tn "Lock on Login" /f
```

## Ollama + Open WebUI (ADR-026)

Local LLM chat accessible from any LAN device.

### Deploy

```bash
# Deploy Ollama
scp gaming-pc/docker/ollama/docker-compose.yml "<GAMING_PC_USER>"@<GAMING_PC_IP>:"C:\Server_Data\Docker\ollama\docker-compose.yml"
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "cd C:\Server_Data\Docker\ollama && docker compose up -d"

# Deploy Open WebUI
scp gaming-pc/docker/open-webui/docker-compose.yml "<GAMING_PC_USER>"@<GAMING_PC_IP>:"C:\Server_Data\Docker\open-webui\docker-compose.yml"
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "cd C:\Server_Data\Docker\open-webui && docker compose up -d"

# Pull models (after Ollama is running)
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "docker exec ollama ollama pull qwen2.5:7b-instruct-q4_K_M"
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "docker exec ollama ollama pull qwen2.5-coder:7b-instruct-q4_K_M"
```

### Verify

```bash
curl http://<GAMING_PC_IP>:11434/api/tags   # Ollama: list models
curl http://<GAMING_PC_IP>:3080             # Open WebUI: chat interface
```

## MCP Servers (ADR-027)

MCP servers run from the repo clone on the Gaming PC. They build via Docker and expose Streamable HTTP endpoints.

### Deploy

```bash
# From the Gaming PC (SSH in or run from console)
cd "C:\Users\<GAMING_PC_USER>\Documents\Projects\lomavo-lab\mcp-servers"

# Create .env from example (first time only)
copy .env.example .env
# Edit .env with actual IPs

# Build and start
docker compose up -d --build
```

### Authentication

All MCP `/mcp` endpoints require Bearer token authentication when `MCP_API_KEY` is set in `.env`:

```bash
# Without auth → 401
curl -X POST http://<GAMING_PC_IP>:8770/mcp

# With auth → 200
curl -X POST http://<GAMING_PC_IP>:8770/mcp -H "Authorization: Bearer <MCP_API_KEY>"

# Health check → always 200 (no auth required)
curl http://<GAMING_PC_IP>:8770/health
```

Configure the token in Open WebUI's MCP server settings and in Claude Code's `.mcp.json` headers.

### Verify

```bash
curl http://<GAMING_PC_IP>:8770/health   # mcp-homelab
curl http://<GAMING_PC_IP>:8771/health   # mcp-monitoring
curl http://<GAMING_PC_IP>:8772/health   # mcp-immich
curl http://<GAMING_PC_IP>:8773/health   # mcp-dns
curl http://<GAMING_PC_IP>:8774/health   # mcp-docker
```

### MCP Client Configuration

Claude Code connects via `.mcp.json` at the repo root (gitignored, contains real IPs). See `.mcp.json.example` for the template.

## Documents Stack (ADR-033)

Personal document management and semantic search. Privacy-sensitive — only accessible to self-hosted LLM via Open WebUI, NOT Claude Code.

### Prerequisites

1. Create NAS SMB share for documents (e.g., `Documents`)
2. Create CIFS Docker volume:
   ```cmd
   docker volume create --driver local --opt type=cifs --opt o=addr=<NAS_IP>,username=<NAS_USER>,password=<NAS_PASSWORD>,vers=3.0,uid=1000,gid=1000 --opt device=//<NAS_IP>/Documents nas-documents
   ```

### Deploy

```cmd
cd C:\Server_Data\Docker\documents
copy .env.example .env
REM Edit .env with actual passwords/keys
docker compose up -d
```

### Verify

```bash
curl http://<GAMING_PC_IP>:8776/api/           # Paperless API
curl https://docs.<DOMAIN>                    # Paperless via Caddy (LAN only)
```

## Notes

- GPU transcoding enabled via NVENC (hwaccel.transcoding.yml)
- Immich fully on C: drive SSD (DB, thumbnails, config) for performance (ADR-011)
- Immich photo/video originals on NAS via CIFS volume (ADR-009)
- Jellyfin uses D:\Server_Data for config and media
- Windows uses `dir` instead of `ls`, `type` instead of `cat`
