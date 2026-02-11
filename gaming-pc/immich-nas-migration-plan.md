# Immich NAS Migration Plan

**Status: COMPLETED** (2026-01-30)

Migrate Immich storage from Gaming PC local drive to hybrid setup with NAS.

## Final Architecture

| Component | Location | Notes |
|-----------|----------|-------|
| Postgres DB | Gaming PC SSD (`C:\Server_Data\Docker\immich\postgres`) | Fast I/O, network storage not supported |
| Thumbnails | Gaming PC HDD (`D:\Server_Data\Docker\immich\library\thumbs`) | Overridden via docker-compose volume |
| Library (originals) | NAS (`//<NAS_IP>/Media/immich/library`) | ~323GB, RAID redundancy |
| Encoded videos | NAS (`//<NAS_IP>/Media/immich/encoded-video`) | ~58GB, bulk storage |
| Upload | NAS (`//<NAS_IP>/Media/immich/upload`) | Temporary uploads |
| Profile | NAS (`//<NAS_IP>/Media/immich/profile`) | < 1KB |
| Backups | NAS (`//<NAS_IP>/Media/immich/backups`) | ~1.9GB |

## Migration Summary

### Key Discovery: Docker Desktop + Windows + NAS

Windows mapped drives (Z:) don't work with Docker Desktop because Docker runs in WSL2, which has a separate filesystem context. The solution was to create a Docker CIFS volume with credentials.

### Prerequisites (Completed)

- [x] NAS is accessible from Gaming PC (`smb://<NAS_IP>/Media`)
- [x] NAS has sufficient space (~5.7TB available)
- [x] Gaming PC has credentials to mount NAS share

## Migration Steps (Completed)

### Phase 1: Prepare NAS ✅

Created folder structure on NAS:
```
//<NAS_IP>/Media/immich/
├── library/        # Original uploads (~323GB)
├── encoded-video/  # Transcoded videos (~58GB)
├── upload/         # Temporary uploads
├── profile/        # User profiles
├── backups/        # Database backups (~1.9GB)
└── thumbs/         # (unused - overridden to local)
```

### Phase 2: Docker CIFS Volume ✅

**Approach used: Docker CIFS volume** (not mapped drive)

Created Docker volume with CIFS credentials:
```bash
docker volume create --driver local \
  --opt type=cifs \
  --opt o=addr=<NAS_IP>,username=<NAS_USER>,password=<NAS_PASSWORD>,vers=3.0,uid=1000,gid=1000 \
  --opt device=//<NAS_IP>/Media/immich \
  nas-immich
```

Note: Windows mapped drives (Z:) don't work with Docker Desktop (WSL2).

### Phase 3: Stop Immich and Backup ✅

1. Created database backup (617MB)
2. Stopped all Immich containers
3. Documented folder sizes:
   - Library: 58,398 files, ~323GB
   - Encoded-video: 7,651 files, ~58GB

### Phase 4: Copy Data to NAS ✅

Used robocopy to copy data (safe copy-then-verify approach):
```cmd
robocopy D:\Server_Data\Docker\immich\library\library Z:\immich\library /E /R:3 /W:5 /ETA
robocopy D:\Server_Data\Docker\immich\library\encoded-video Z:\immich\encoded-video /E /R:3 /W:5 /ETA
```

Verified file counts match between source and destination.

### Phase 5: Update Configuration ✅

1. **Added NAS credentials to `.env`:**
   ```env
   NAS_USERNAME=<NAS_USER>
   NAS_PASSWORD=<NAS_PASSWORD>
   ```

2. **Updated `docker-compose.yml` to use external CIFS volume:**
   ```yaml
   immich-server:
     volumes:
       # NAS storage via CIFS volume
       - nas-immich:/data
       # Keep thumbs on local drive for performance (not NAS)
       - D:/Server_Data/Docker/immich/library/thumbs:/data/thumbs
       - /etc/localtime:/etc/localtime:ro

   volumes:
     nas-immich:
       external: true
   ```

   **Future optimization (separate task):** Move thumbs from D: (HDD) to C: (SSD).

### Phase 6: Start and Verify ✅

1. Started Immich: `docker compose up -d`
2. Checked logs - all services healthy:
   - "Immich Server is listening on http://[::1]:2283 [v2.5.2]"
   - "Machine learning server became healthy"
   - "Immich Microservices is running [v2.5.2]"
3. All 4 containers showing (healthy) status

**User verification needed:**
- [ ] Browse existing photos in web UI
- [ ] Upload a test photo
- [ ] Verify it appears on NAS

### Phase 7: Cleanup ✅

Deleted source folders from D: drive after verification:
- library (~301 GB)
- encoded-video (~54 GB)
- upload, profile, backups (~2 GB)

**Total reclaimed: ~358 GB**

**Kept:** `D:\Server_Data\Docker\immich\library\thumbs` (still in use by Docker)

2. **Update documentation:**
   - gaming-pc/README.md
   - infrastructure/services.md

3. **Future optimization task:**
   - Move thumbs from D:\...\thumbs to C:\...\thumbs (SSD)
   - Update docker-compose.yml thumbs path accordingly

## Rollback Plan

If migration fails:
1. Stop Immich: `docker compose down`
2. Move files back: `robocopy Z:\immich\library D:\Server_Data\Docker\immich\library /E /MOVE`
3. Restore original .env and docker-compose.yml
4. Start Immich: `docker compose up -d`

## Estimated Timeline

- Phase 1-2: 15 minutes (NAS prep, mount)
- Phase 3: 10 minutes (backup, stop)
- Phase 4: **2-4 hours** (depends on network speed, ~626GB @ 2.5GbE)
- Phase 5-6: 30 minutes (config, verify)
- Total: **3-5 hours** (mostly waiting for file transfer)

## References

- [Immich Custom Locations Guide](https://docs.immich.app/guides/custom-locations/)
- [Immich External Libraries](https://docs.immich.app/features/libraries/)
- [HexOS Migration Guide](https://docs.hexos.com/community/community-guides/ImmichMigrationMove.html)

## Resolved Questions

- [x] **Sizes:** Library ~323GB (58K files), Encoded-video ~58GB (7.6K files), Backups ~1.9GB
- [x] **Profile/backups:** Now on NAS via CIFS volume
- [x] **Storage template settings:** No changes needed - Immich automatically uses the mounted paths

## Remaining Tasks

- [x] User verification: Browse photos, upload test photo
- [x] Cleanup: Deleted original folders from D: drive (~358 GB reclaimed)
- [ ] Future: Move thumbs from D: HDD to C: SSD for better performance
