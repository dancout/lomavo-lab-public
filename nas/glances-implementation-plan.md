# NAS Glances Implementation Plan

**Goal**: Add CPU/RAM/Disk metrics for QNAP NAS to Homepage dashboard.

**Context**: Unlike Gaming PC (where Glances in Docker can't see Windows host metrics), the NAS runs Linux-based QTS, so Glances in a container CAN access real host metrics.

## Why Glances on NAS Works Better

| Platform | Glances in Docker sees... |
|----------|---------------------------|
| Windows (Gaming PC) | Only container metrics (Docker runs in VM) |
| Linux (QNAP NAS) | Full host metrics (Docker shares kernel) |

## Prerequisites

- [x] QNAP NAS running QTS 5.2
- [x] Container Station installed and available
- [x] SSH access to NAS (`ssh <NAS_USER>@<NAS_IP>`)

## Implementation Steps

### Phase 1: Deploy Glances Container

**Option A: Via Container Station Web UI** (if no SSH)
1. Open Container Station at http://<NAS_IP>:8080
2. Go to "Create" → "Create Application"
3. Use docker-compose config below
4. Deploy

**Option B: Via SSH** (preferred, if configured)
1. SSH to NAS
2. Create directory for compose file
3. Deploy with docker compose

**Docker Compose Configuration:**
```yaml
services:
  glances:
    image: nicolargo/glances:latest-full
    container_name: glances
    restart: unless-stopped
    pid: host
    network_mode: host
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - GLANCES_OPT=-w
```

**Note**: `network_mode: host` works on Linux (unlike Windows), so port 61208 is exposed directly.

### Phase 2: Firewall Configuration (ASK USER FIRST)

QNAP may have firewall rules that block external access to port 61208.

**Check/configure via:**
- QTS Control Panel → Security → Security Level
- Or via CLI if SSH available

**Action needed**: Open TCP port 61208 for local network access (local network).

### Phase 3: Add to Homepage

Update `rpi/docker/homepage/config/services.yaml`:

```yaml
- QNAP NAS:
    icon: qnap.png
    href: http://<NAS_IP>:8080
    description: Storage Server
    widget:
      type: glances
      url: http://<NAS_IP>:61208
      version: 4
      metric: info
```

The `metric: info` should work on Linux and show:
- Hostname, OS, kernel
- CPU usage
- RAM usage
- Swap usage

Alternative metrics if `info` has issues:
- `cpu` - CPU usage graph
- `memory` - RAM usage graph
- `fs:/share/CACHEDEV1_DATA` - Disk usage (need to find correct mount point)

### Phase 4: Add to Uptime Kuma

Add HTTP monitor for http://<NAS_IP>:61208 to track Glances availability.

## Verification

1. Test Glances web UI directly: http://<NAS_IP>:61208
2. Check Homepage widget displays metrics
3. Verify Uptime Kuma shows service as UP

## Files to Update

- [ ] `nas/docker/glances/docker-compose.yml` - Create compose file in repo
- [ ] `rpi/docker/homepage/config/services.yaml` - Add/update QNAP widget
- [ ] `infrastructure/services.md` - Add Glances to NAS services
- [ ] `nas/README.md` - Document Glances setup (may need to create this file)
- [ ] `next-steps.md` - Mark NAS monitoring items complete

## Rollback

If issues occur:
1. Stop/remove Glances container via Container Station
2. Revert Homepage config to simple link (no widget)
3. Close firewall port if opened

## Security Considerations

- Glances exposes system information (CPU, RAM, processes, network connections)
- Only accessible from local network (10.0.0.x) unless explicitly exposed
- Read-only - no ability to execute commands or modify system
- **ASK USER before opening firewall ports**

## Deployment Complete (2026-01-30)

**What was deployed:**
- Glances container running on NAS via Container Station
- Accessible at http://<NAS_IP>:61208
- Homepage widgets: system metrics (info) + storage (fs:/rootfs/share/CACHEDEV1_DATA)
- Uptime Kuma monitor added for http://<NAS_IP>:61208

**QNAP-specific notes:**
- Docker socket is at `/var/run/system-docker.sock` (not `/var/run/docker.sock`)
- Must set `DOCKER_HOST=unix:///var/run/system-docker.sock` for docker commands
- Docker binary at `/share/CACHEDEV1_DATA/.qpkg/container-station/usr/bin/.libs/docker`
- Compose file at `/share/CACHEDEV1_DATA/docker/glances/docker-compose.yml`

**To manage Glances on NAS:**
```bash
ssh <NAS_USER>@<NAS_IP>
cd /share/CACHEDEV1_DATA/docker/glances
DOCKER_HOST=unix:///var/run/system-docker.sock /share/CACHEDEV1_DATA/.qpkg/container-station/usr/bin/.libs/docker compose logs
DOCKER_HOST=unix:///var/run/system-docker.sock /share/CACHEDEV1_DATA/.qpkg/container-station/usr/bin/.libs/docker compose restart
```

## Related Documentation

- ADR-008: NAS Storage Configuration
- ADR-012: Windows Host Metrics (similar approach for Gaming PC)
- `gaming-pc/system-monitoring-plan.md` - Reference for similar implementation
