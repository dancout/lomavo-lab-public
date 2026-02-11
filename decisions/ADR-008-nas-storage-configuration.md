# ADR-008: NAS Storage Configuration

**Status:** Accepted
**Date:** 2026-01-29

## Context

Setting up the QNAP TS-433 NAS with 3x4TB Seagate Ironwolf drives. Needed to decide on:
1. RAID configuration
2. Volume type (thick/thin/static)
3. Snapshot space allocation
4. Whether to partition non-RAID space for logs

## Decisions

### 1. RAID 5 for All Storage

**Decision:** Use RAID 5 with all 3 drives in a single storage pool.

**Rationale:**
- Provides redundancy (survives 1 drive failure)
- ~7.28TB usable from 3x3.64TB drives (33% overhead for parity)
- Seagate Ironwolf drives are rated for NAS RAID workloads (180TB/year, 1M hours MTBF)

### 2. Thick Volume

**Decision:** Use thick volume rather than thin or static.

**Rationale:**
- **Thick:** Pre-allocates space, simpler, slightly better performance
- **Thin:** On-demand allocation, useful for multiple volumes sharing space (not our case)
- **Static:** Bypasses storage pool, loses snapshot capability

Single-purpose home NAS → thick is straightforward choice.

### 3. Snapshot Space: 20%

**Decision:** Keep default 20% snapshot reservation.

**Rationale:**
- Provides point-in-time recovery from accidental deletion
- Can be reduced later if more space is needed
- 5.8TB usable is sufficient for current needs

### 4. RAID 5 for Logs (No Separate Non-RAID Partition)

**Decision:** Store centralized logs on the RAID 5 volume, not on a separate non-RAID partition.

**Reasoning against non-RAID log partition:**
- Storage pool already created with all 3 drives - can't easily carve out non-RAID space
- Single-drive partition would be first to fail with no redundancy
- Losing logs to drive failure is worse than theoretical wear savings

**Reasoning why RAID 5 write penalty is acceptable for logs:**
- RAID 5 "write penalty" (read-modify-write for parity) affects latency, not drive lifespan
- Seagate Ironwolf drives rated for 180TB/year (~500GB/day)
- Homelab logs realistically generate 10-100MB/day (<0.02% of rated workload)
- HDDs don't have write wear limits like SSDs
- Drives will handle log writes without issue for 5-10+ years

**Alternative considered:** Gaming PC SSD for logs
- Rejected: SSDs actually have write wear concerns (limited write cycles)
- Requires PC to be always-on
- Not designed as a storage server

## Network Configuration

- **Static IP:** `<NAS_IP>` (see `.env.local`)
- **DNS:** Pi-hole (`<RPI_IP>`) primary, 8.8.8.8 secondary
- **Time:** NTP sync enabled
- **Firmware:** Notify only, no auto-update (safer for NAS infrastructure)

## Consequences

**Positive:**
- Simple, unified storage configuration
- All data protected by RAID 5 redundancy
- Logs are protected from drive failure
- Can adjust snapshot space later if needed

**Negative:**
- Can't easily add non-RAID storage without recreating pool
- 33% storage overhead for parity (acceptable trade-off)

## Shared Folders Created

| Folder | Purpose |
|--------|---------|
| Media | Jellyfin/Immich storage, general media |
| Logs | Centralized logging from all devices |
| Public | Default QNAP folder (can repurpose or delete) |
