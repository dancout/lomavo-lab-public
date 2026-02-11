# ADR-011: Immich SSD Consolidation

**Status:** Accepted
**Date:** 2026-01-30

## Context

Immich on the Gaming PC had data spread across two drives:
- **C: drive (SSD):** Postgres database
- **D: drive (HDD):** Thumbnails, config files, stale backup

ADR-009 documented the hybrid storage architecture and noted "Future optimization: Move thumbnails from HDD to SSD for better performance."

Questions arose about:
1. Whether SSD wear from thumbnails/database is a concern
2. Whether splitting across drives added unnecessary complexity

## Decision

### 1. Consolidate All Immich Data to SSD (C: drive)

**Decision:** Move all Immich Docker files and data to `C:\Server_Data\Docker\immich\`.

**Final structure:**
```
C:\Server_Data\Docker\immich\
├── .env                      # Secrets (NAS creds, DB password)
├── docker-compose.yml        # Container definitions
├── hwaccel.transcoding.yml   # NVENC config
├── immich_db_backup.sql      # Database backup
├── model-cache/              # ML model cache
├── postgres/                 # Database (was already here)
└── thumbs/                   # Thumbnails (moved from D:)
```

**Rationale:**
- **Simplicity:** Single location for all Immich files
- **Maintainability:** Easier to backup, restore, and document
- **Performance:** Both thumbnails and database benefit from SSD random I/O

### 2. SSD Wear is Not a Concern

**Decision:** Accept SSD write load from thumbnails and database operations.

**Research findings:**
- Modern consumer SSDs are rated for 150-600 TBW (Terabytes Written)
- Typical daily writes of 20-50GB would take 20-30+ years to exhaust a 500 TBW SSD
- Thumbnails are write-once, read-many (generated once per photo)
- Real-world testing shows SSDs often exceed rated TBW by 2-6x
- Immich officially recommends SSD for both database and thumbnails

### 3. Bulk Media Stays on NAS

**Decision:** Photo/video originals remain on NAS via CIFS volume (unchanged from ADR-009).

| Component | Location | Reason |
|-----------|----------|--------|
| Originals, encoded video, backups | NAS (CIFS) | Bulk storage, RAID redundancy |
| Postgres, thumbnails, config | Gaming PC SSD | Performance, simplicity |

## Implementation

1. Stopped Immich containers
2. Synced thumbnails from D: to C: using robocopy (70,940 files, 11.4 GB)
3. Copied config files to C:
4. Updated docker-compose to reference C: paths
5. Started Immich from C: drive location
6. Deleted entire D:\Server_Data\Docker\immich directory

## Consequences

**Positive:**
- Single location for all Immich files on Gaming PC
- Improved thumbnail browsing performance (SSD vs HDD)
- Freed ~12 GB on D: drive (HDD)
- Simplified backup and documentation

**Negative:**
- Consumes ~12 GB on C: drive (SSD) for thumbnails
- SSD has less total capacity than HDD (acceptable trade-off)

**Supersedes:** ADR-009 "Future considerations" item about moving thumbnails to SSD is now complete.

## References

- [Immich Requirements - SSD Recommended](https://docs.immich.app/install/requirements/)
- [Immich Community Discussion on SSD vs HDD](https://lemmy.world/post/16678188)
- [SSD Endurance and TBW Explained](https://americas.lexar.com/tbw-and-ssd-endurance/)
