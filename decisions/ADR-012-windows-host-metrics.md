# ADR-012: Windows Host Metrics Collection Strategy

**Status:** Accepted
**Date:** 2026-01-30

## Context

We deployed Glances in Docker on the Gaming PC to monitor system resources. However, Glances running inside Docker on Windows can only see container-level metrics (CPU/RAM per container), not the actual Windows host metrics. This is because Docker Desktop runs containers inside a Linux VM (WSL2), isolated from the Windows host.

We need visibility into actual Windows host metrics (CPU, RAM, disk) to understand overall system health, especially when sharing Immich with family members.

## Options Considered

### Option 1: Native Glances on Windows
- Install Glances directly on Windows via pip
- Full-featured monitoring with web UI and API
- **Pros:** Feature-rich, Homepage widget compatible, well-maintained
- **Cons:** Requires Python runtime, larger attack surface, exposes extensive system info by default

### Option 2: Windows Exporter + Prometheus + Grafana
- Industry-standard metrics collection stack
- **Pros:** Powerful, scalable, long-term solution, alerting capabilities
- **Cons:** Complex setup, heavier resource usage, overkill for current needs

### Option 3: Custom PowerShell Metrics Endpoint
- Simple PowerShell script exposing JSON metrics on HTTP port
- **Pros:** Minimal footprint, no dependencies (PowerShell is built-in), exposes only chosen metrics, small attack surface
- **Cons:** Basic functionality, no historical data, requires custom Homepage widget or manual checking

## Decision

Implement **Option 3 (PowerShell endpoint)** as the immediate solution for Windows host metrics.

Rationale:
- Lightest weight solution - no additional software to install
- Minimal security exposure - only returns CPU/RAM/disk percentages
- Can run as Windows Task Scheduler job (starts before user login)
- Sufficient for current monitoring needs

### Future Path
1. **Current**: PowerShell endpoint for basic host metrics
2. **Intermediate**: Native Glances if more detailed monitoring needed (Option 1)
3. **Long-term**: Prometheus/Grafana stack when ready for comprehensive observability (Option 2)

## Implementation

- PowerShell script at `C:\Server_Data\Scripts\metrics-endpoint.ps1`
- Runs on port 61209 (61208 is Glances containers)
- Returns JSON: `{ "cpu": N, "memUsedGB": N, "memTotalGB": N, "diskC_UsedGB": N, "diskC_TotalGB": N }`
- Task Scheduler job to start at system boot (before login)

## Consequences

**Positive:**
- Immediate visibility into Windows host health
- No additional software dependencies
- Starts before user login (addresses Docker Desktop limitation)
- Minimal attack surface

**Negative:**
- No historical data or graphs (would need Prometheus for that)
- Homepage Glances widget won't work with custom endpoint (need custom widget or manual access)
- Must maintain custom script

**Note:** This complements (not replaces) the Docker Glances container which provides valuable container-level metrics.
