# Deploy Commands

Quick reference for deploying configs to homelab machines. Replace `<PLACEHOLDERS>` with values from `.env.local`.

## Raspberry Pi

```bash
# Deploy a service config
scp rpi/docker/SERVICE/docker-compose.yml <RPI_USER>@<RPI_IP>:~/SERVICE/
ssh <RPI_USER>@<RPI_IP> "cd ~/SERVICE && docker compose down && docker compose up -d"

# Deploy Homepage (special - needs sudo for config)
scp rpi/docker/homepage/config/services.yaml <RPI_USER>@<RPI_IP>:/tmp/
ssh <RPI_USER>@<RPI_IP> "sudo cp /tmp/services.yaml ~/homepage/config/ && cd ~/homepage && docker compose up -d"
```

## Gaming PC

```bash
# Run PowerShell command (quotes around username if it has spaces)
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "powershell -Command \"Your-Command\""

# Restart a scheduled task
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "schtasks /run /tn \"Task Name\""
```

**Note:** Docker pull/compose commands fail over SSH due to Docker Desktop credential store issues. Give the user exact commands to run locally on the Gaming PC console instead. Read-only Docker commands (ps, inspect, curl) work fine over SSH.

## QNAP NAS

```bash
# Docker command prefix (required for all docker operations)
export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:$PATH
DOCKER_HOST=unix:///var/run/system-docker.sock docker compose ...

# Deploy a service config
scp nas/docker/SERVICE/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/SERVICE/
ssh <NAS_USER>@<NAS_IP> "export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && cd /share/CACHEDEV1_DATA/docker/SERVICE && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose up -d"
```

### Prometheus

Prometheus config uses `${VAR}` template variables (IPs, Qdrant API key). The deploy script runs on the **deployment node** (currently MacBook, portable to any Unix system with NAS access) to resolve variables via `envsubst` before SCP.

**Automated deploy (recommended):**
```bash
# Run from deployment node (MacBook or any system with envsubst + NAS access)
./nas/docker/prometheus/deploy.sh
```

**Manual SCP (docker-compose only):**
```bash
scp nas/docker/prometheus/docker-compose.yml <NAS_USER>@<NAS_IP>:/share/CACHEDEV1_DATA/docker/prometheus/
```

**WARNING:** Do NOT SCP `prometheus.yml` directly — it contains `${VAR}` placeholders. Always use `deploy.sh`.

**Future portability:** `deploy.sh` can run from any Unix system (Linux, WSL, container) with network access to NAS and `envsubst` available. No MacBook-specific dependencies.

## Common Patterns

- **NAS services:** SCP compose file, SSH in, `docker compose up -d`
- **Homepage:** SCP to `/tmp`, `sudo cp` to `~/homepage/config/`, then `docker compose up -d` (NOT `restart`)
- **NAS keepalived:** After SCP, must chown `check_pihole.sh` to UID 0 via nsenter
- **MCP servers on Gaming PC:** SCP to project dir, user runs `docker compose build && docker compose up -d` locally

**CRITICAL:** `docker compose restart` does NOT re-read `.env` files. Use `docker compose up -d` when `.env` has changed. Only use `restart` for volume-mounted config file changes.
