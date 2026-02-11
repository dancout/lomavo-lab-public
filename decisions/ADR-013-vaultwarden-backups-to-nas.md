# ADR-013: VaultWarden Backups on NAS

**Status:** Accepted
**Date:** 2026-01-30

## Context

VaultWarden password manager runs on the Raspberry Pi. Daily automated backups (2 AM cron job) were stored on the Gaming PC at `D:\Server_Data\Backups` via CIFS mount. This had two issues:

1. **Availability**: Gaming PC is not always on, so backups could fail
2. **Redundancy**: Single drive with no RAID protection

The QNAP NAS provides RAID 5 protection and is always-on.

## Decision

Move VaultWarden backups from the Gaming PC to the QNAP NAS:

1. Created dedicated `Backups` SMB share on NAS
2. Added NAS mount on Pi at `/home/<RPI_USER>/nas_backups`
3. Updated backup script (`~/backup_vault.sh`) to write to NAS
4. Migrated existing backups (20 files, ~2.2MB)
5. Deleted old backups from Gaming PC

**Backup configuration:**
- Source: `/home/<RPI_USER>/docker/vaultwarden/vw-data`
- Destination: `/home/<RPI_USER>/nas_backups` (mounted from `//<NAS_IP>/Backups`)
- Schedule: Daily at 2 AM via cron
- Retention: 30 days (older backups auto-deleted)

## Consequences

**Positive:**
- Backups protected by RAID 5 (survives single drive failure)
- NAS is always-on, so backups never fail due to target being offline
- Dedicated share keeps backups organized and separate from media

**Negative:**
- Additional NAS credentials file on Pi (`~/.nas_smbcredentials`)
- Second CIFS mount to maintain on Pi

**Files changed on Pi:**
- `/home/<RPI_USER>/backup_vault.sh` - Updated destination path
- `/etc/fstab` - Added NAS Backups mount
- `/home/<RPI_USER>/.nas_smbcredentials` - New credentials file (chmod 600)
