# ADR-009: Immich NAS Storage Architecture

**Status:** Accepted
**Date:** 2026-01-30

## Context

Migrating Immich photo storage from Gaming PC local drives to QNAP NAS for:
- RAID 5 redundancy for irreplaceable photos
- Freeing up Gaming PC storage (~358 GB)
- Centralized storage accessible even when PC is off (future consideration)

Key technical challenge: Docker Desktop on Windows runs in WSL2, which has limited access to Windows filesystem features.

## Decisions

### 1. Docker CIFS Volume (Not Windows Mapped Drives)

**Decision:** Use Docker's CIFS volume driver with credentials instead of Windows mapped drives.

**Rationale:**
- Windows mapped drives (Z:, etc.) are user-session specific
- Docker Desktop runs in WSL2, which cannot access Windows mapped drives
- Attempting to use `Z:\path` in docker-compose results in "path not found" errors
- CIFS volumes are created at the Docker level and persist across sessions

**Implementation:**
```bash
docker volume create --driver local \
  --opt type=cifs \
  --opt o=addr=<NAS_IP>,username=<user>,password=<pass>,vers=3.0,uid=1000,gid=1000 \
  --opt device=//<NAS_IP>/Media/immich \
  nas-immich
```

### 2. Hybrid Storage Architecture

**Decision:** Split storage between NAS and local drives based on access patterns.

| Component | Location | Reason |
|-----------|----------|--------|
| Library (originals) | NAS | Bulk storage, RAID redundancy, ~301 GB |
| Encoded videos | NAS | Large files, less frequent access, ~54 GB |
| Upload (temp) | NAS | Temporary staging, small |
| Profile | NAS | User avatars, tiny |
| Backups | NAS | Database backups benefit from off-machine storage, ~2 GB |
| **Thumbnails** | **Gaming PC SSD** | Frequently accessed, latency-sensitive (see ADR-011) |
| **Postgres DB** | **Gaming PC SSD** | Network storage not supported by Postgres |

### 3. Thumbnails on Local Storage

**Decision:** Keep thumbnails on Gaming PC local drive, not NAS.

**Rationale:**
- Thumbnails are accessed constantly when browsing the Immich UI
- Network latency would significantly impact browsing experience
- Thumbnails are regenerable from originals if lost
- ~~Current location: `D:\Server_Data\Docker\immich\library\thumbs`~~
- ~~Future optimization: Move to C: SSD for even better performance~~
- **Completed:** Moved to `C:\Server_Data\Docker\immich\thumbs` (see ADR-011)

### 4. Credentials in .env File

**Decision:** Store NAS credentials (NAS_USERNAME, NAS_PASSWORD) in the .env file on the Gaming PC.

**Rationale:**
- .env file is already used for other secrets (DB_PASSWORD)
- Not committed to version control
- Required for Docker volume creation (can't use Windows Credential Manager from WSL2)

**Trade-off:** Password stored in plaintext on Gaming PC filesystem. Acceptable for home network with physical security.

## Consequences

**Positive:**
- Photos protected by RAID 5 redundancy
- ~358 GB freed on Gaming PC
- Backups stored off-machine
- Architecture documented for future reference

**Negative:**
- Requires Gaming PC to be on for Immich to function (NAS hosts storage, not compute)
- NAS credentials stored in plaintext .env file
- More complex setup than simple local storage

**Future considerations:**
- Move Immich containers to NAS if it supports Docker (would enable photos access without PC)
- ~~Move thumbnails from HDD to SSD for better performance~~ **Done: ADR-011**
