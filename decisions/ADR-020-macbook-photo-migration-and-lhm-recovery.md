# ADR-020: MacBook Photo Migration to Immich and LHM Auto-Recovery

**Status**: Accepted

**Date**: 2026-02-04

## Context

A 2011 MacBook Pro backup on an external HDD (exFAT, USB-connected to Gaming PC as E: drive) contained ~4,700 photos in the macOS Photos Library structure at `E:\DansMacbook\Users\danielcouturier\Pictures\Photos Library.photoslibrary\Masters`. These needed to be uploaded to Immich and organized into a single album ("Macbook Pro 2011 Photo Dump") for easy bulk management and potential rollback.

During this process, two infrastructure issues were discovered:
1. Docker Desktop (WSL2 backend) could not see the contents of the exFAT USB drive beyond a certain directory depth
2. LibreHardwareMonitor had stopped running, causing null temperature readings on the Homepage dashboard, and had no auto-restart policy

## Decision

### Photo Migration

**Staging approach for USB drive limitation:**
Docker Desktop on Windows uses WSL2, which does not reliably mount exFAT USB volumes. The Masters directory appeared empty inside Docker containers despite containing 4,709 files (9.26 GB) visible to Windows. The workaround was to copy files to a local NTFS path (`C:\temp\MacbookPhotos`) before uploading.

**Immich CLI setup:**
- Node.js on the Gaming PC was v10.15.0, too old for the Immich CLI (requires Node 20+)
- Updated Node.js to v22.13.1 via MSI installer
- Used `npx @immich/cli` directly rather than Docker-based CLI (simpler, no credential/networking issues)
- Created a dedicated API key in Immich for the upload, revoked afterward

**CLI flag lesson learned:**
- `--album` creates albums based on folder names (one album per subdirectory)
- `--album-name "Name"` puts all assets into a single named album
- Initial upload used `--album` incorrectly, creating 14 folder-based albums
- Fix: re-ran with `--album-name`, which skipped all duplicates (hash-based detection) and created the correct single album, then deleted the 14 wrong albums via API
- The Immich CLI creates albums _after_ all uploads complete, not during — important to know for interrupted uploads

**Final result:** 4,677 assets in a single "Macbook Pro 2011 Photo Dump" album. Staging files cleaned up after verifying originals remained on E: drive.

### LibreHardwareMonitor Auto-Recovery

The Node.js MSI installation disrupted running services, including the Metrics Endpoint and LibreHardwareMonitor. The Metrics Endpoint was restarted manually, and LHM was restarted via its scheduled task. LHM's web server config (`runWebServerMenuItem=true`) was already persisted, it just needed the process restarted.

**Auto-recovery policy:** Configured the `LibreHardwareMonitor` scheduled task with restart-on-failure:
- Restart count: 3
- Restart interval: 1 minute

This was chosen over having the metrics-endpoint script restart LHM because:
- Windows Task Scheduler is the correct layer for process lifecycle management
- Avoids coupling between the two services
- Simpler implementation (no script changes needed)

## Consequences

**Positive:**
- All MacBook photos preserved in Immich with single-album organization for easy rollback
- Immich CLI is now available on the Gaming PC for future bulk uploads
- LHM will auto-recover from crashes without manual intervention
- Node.js v22 available on Gaming PC for future tooling needs

**Negative:**
- Node.js MSI installer left stale npm shims (npm.ps1/npx.ps1 still point to old v6.9.0); workaround is to invoke npm via full path: `& 'C:\Program Files\nodejs\node.exe' 'C:\Program Files\nodejs\node_modules\npm\bin\npx-cli.js'`
- Docker Desktop + WSL2 cannot reliably access exFAT USB drives — any future USB-based imports will need NTFS staging

**Immich CLI reference (for future uploads):**
```powershell
# Login (creates auth.yml)
npx @immich/cli login http://localhost:2283/api <API_KEY>

# Upload to a single named album
npx @immich/cli upload --album-name "Album Name" --recursive "C:\path\to\photos"

# Upload with auto-albums from folder names
npx @immich/cli upload --album --recursive "C:\path\to\photos"
```

## References

- ADR-009: Immich NAS Storage Architecture
- ADR-011: Immich SSD Consolidation
- ADR-012: Windows Host Metrics Collection Strategy
- ADR-016: System Monitoring Strategy
