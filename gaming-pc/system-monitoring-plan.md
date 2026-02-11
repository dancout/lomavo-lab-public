# System Monitoring Implementation Plan

**Goal**: Add live CPU/RAM/Storage visibility for Gaming PC on Homepage, plus verify Immich monitoring for tracking usage when sharing with family.

**Context**: Preparing to share Immich with brother; need quick visibility into server activity without full telemetry stack.

## Phase 1: Glances on Gaming PC

### What is Glances?
Lightweight system monitoring tool with web UI and API. Homepage has native widget support.

### Tasks
- [x] Create `gaming-pc/docker/glances/` directory with docker-compose.yml
- [x] Deploy Glances container on Gaming PC
- [x] Add Glances to Homepage dashboard (Infrastructure section) - shows container metrics
- [x] Add Glances to Uptime Kuma monitoring (http://<GAMING_PC_IP>:61208)
- [x] Update `infrastructure/services.md`
- [x] Update `gaming-pc/README.md`

### Docker Configuration
```yaml
services:
  glances:
    image: nicolargo/glances:latest-full
    container_name: glances
    restart: unless-stopped
    pid: host
    ports:
      - "61208:61208"
    volumes:
      - //var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - GLANCES_OPT=-w
```

**Port**: 61208 (default Glances web UI)

### Windows Docker Limitations
Glances in Docker on Windows cannot access host CPU/RAM/disk metrics directly (Docker runs in a VM). However, it **can** show container-level metrics:
- Per-container CPU usage
- Per-container memory usage
- Per-container network I/O (useful for seeing Immich upload activity)

For full Windows host metrics, would need native Windows Glances installation.

### Homepage Widget
```yaml
- Gaming PC:
    icon: mdi-desktop-tower-monitor
    widget:
      type: glances
      url: http://<GAMING_PC_IP>:61208
      metric: info  # or cpu, memory, disk:C:, etc.
```

## Phase 2: Enhanced Immich Monitoring

### Current State
Homepage already has Immich widget configured with API key. Shows:
- User count
- Photo/video counts
- Storage usage

### Tasks
- [x] Verify Immich widget is working and showing useful stats
  - API key configured in Homepage .env: `HOMEPAGE_VAR_IMMICH_API_KEY`
  - Immich API responding at `http://<GAMING_PC_IP>:2283/api/`
- [ ] (Optional) Add additional Immich metrics if available via API

## Phase 3: Windows Host Metrics (ADR-012)

### Problem
Glances in Docker can only see container metrics, not actual Windows host CPU/RAM/disk.

### Solution
Custom PowerShell script (`metrics-endpoint.ps1`) exposing JSON on port 61209.

### Tasks
- [x] Create PowerShell script in `gaming-pc/scripts/`
- [x] Deploy script to `C:\Server_Data\Scripts\`
- [x] Create Windows Task Scheduler job (runs at startup as SYSTEM)
- [x] Add Windows Firewall rule for port 61209
- [x] Add to Uptime Kuma monitoring (http://<GAMING_PC_IP>:61209)
- [x] Update `infrastructure/services.md`
- [x] Update `gaming-pc/README.md` with setup instructions
- [x] Create ADR-012 documenting the decision

### Endpoint
- URL: `http://<GAMING_PC_IP>:61209/`
- Returns: CPU %, Memory (used/total/%), Disk C: and D: (used/total/%)

## Completion Checklist

Before merging (per CONTRIBUTING.md):
- [x] Update `next-steps.md` - mark Homepage Enhancement items complete
- [x] Update `infrastructure/services.md` - add Glances and metrics-endpoint
- [x] Update `gaming-pc/README.md` - add services and setup docs
- [x] Create ADR-012 for Windows host metrics decision
- [x] Update `decisions/README.md` with ADR-012

## Future Considerations

- **NAS Monitoring**: Could add Glances to NAS via Container Station later
- **Full Telemetry**: This doesn't replace Phase 2 plans for Grafana/Loki - it's complementary
- **Alerts**: Could configure Uptime Kuma to alert if Glances goes down (indicates PC issues)
