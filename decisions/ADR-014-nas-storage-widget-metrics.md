# ADR-014: NAS Storage Widget Metrics

**Status:** Accepted
**Date:** 2026-01-30

## Context

The Homepage dashboard needed to display NAS storage metrics with percentage utilization. The QNAP NAS has:
- Storage Pool: ~7.28TB raw (RAID 5 with 3x4TB drives)
- 20% Snapshot Reservation: ~1.45TB reserved at pool level
- DataVol1 (Thick Volume): ~5.6TB usable space

We needed to determine:
1. What the current Glances widget actually displays
2. Whether we could show snapshot pool metrics separately
3. How to make the widget clearer about what it's showing

## Investigation

### Glances Filesystem Data

Glances running on the NAS (via Container Station) exposes filesystem metrics at `/api/4/fs`. For the main data volume (`/rootfs/share/CACHEDEV1_DATA`):

| Metric | Value | Notes |
|--------|-------|-------|
| Total | 5.61 TB | Thick volume size (after 20% snapshot reservation) |
| Used | 0.37 TB | Actual data stored |
| Free | 5.25 TB | Available for new data |
| Percent | 6.5% | Volume utilization |

This confirms Glances shows the **thick volume metrics**, not the raw storage pool. The 20% snapshot space is managed at the storage pool level and is invisible to filesystem-level tools.

### QNAP Native API Investigation

Attempted to query QNAP's native API for snapshot pool metrics:

- **API Endpoint:** `https://<NAS_IP>:443/cgi-bin/`
- **Result:** All storage-related endpoints require authentication
- **Credentials:** SMB credentials (`<NAS_USER>`) don't work for web API (QNAP uses separate admin credentials)
- **SSH:** Not enabled on NAS at time of investigation

Endpoints tested:
- `/cgi-bin/disk/disk_manage.cgi?disk_func=get_all_diskinfo` → Auth required
- `/cgi-bin/sys/sysRequest.cgi?subfunc=system_resource` → Auth required
- `/cgi-bin/management/manaRequest.cgi?subfunc=sysinfo` → Auth required

## Decision

### 1. Use CustomAPI Widget with Glances

Switch from `glances` widget type to `customapi` for full control over displayed fields:

```yaml
widget:
  type: customapi
  url: http://<NAS_IP>:61208/api/4/fs
  refreshInterval: 10000
  mappings:
    - field: "0.percent"
      label: Vol Used
      format: percent
    - field: "0.used"
      label: Data
      format: bytes
    - field: "0.free"
      label: Vol Free
      format: bytes
```

### 2. Clear Labeling

Updated description to "DataVol1 (Thick Volume)" and labels to "Vol Used", "Vol Free" to make clear this is volume-level metrics, not total pool capacity.

### 3. Defer Snapshot Pool Metrics

Snapshot pool visibility requires one of:
- **QNAP Admin Credentials:** For native API access
- **SSH Access:** Query storage pool directly via CLI (`get_storage_info` or similar)
- **SNMP:** Standard monitoring protocol (requires NAS configuration)

## Consequences

**Positive:**
- Widget now shows percentage utilization as requested
- Clear labeling prevents confusion about what's being measured
- Glances approach is simple and doesn't require additional credentials

**Negative:**
- Cannot display snapshot pool usage without additional NAS configuration
- Relying on array index `0` assumes RAID volume is first in filesystem list (stable but implicit)

**Future Work:**
To add snapshot pool metrics, enable one of:
1. SSH on QNAP (preferred - simplest)
2. SNMP on QNAP (standardized monitoring)
3. Store QNAP admin credentials securely for API access
