# RB-004: Power Outage — Gaming PC Services Down, NAS Partial Recovery

**Date**: 2026-02-13
**Machines**: Gaming PC, NAS
**Impact**: All Gaming PC Docker services (Immich, Jellyfin, Glances, MCP servers) offline; NAS backup Pi-hole not running; NAS SSH inaccessible; NAS high CPU for 8+ hours
**Status**: Resolved — all services restored, RAID resync completed overnight

## Symptoms

- Power blip caused all homelab hardware to lose power
- Gaming PC did not turn back on automatically (no Wake-on-LAN / BIOS auto-restart configured)
- After manually pressing power button, Gaming PC booted to lock screen — no services started
- NAS rebooted on its own, but:
  - Backup Pi-hole container not running (port 53 connection refused)
  - SSH inaccessible (timeout from MacBook, `/share/homes` symlink missing after reboot)
  - Abnormally high CPU usage (load average ~5 on 4-core ARM) sustained for 8+ hours
  - QNAP prompted that admin password changed to "cloud key"
  - All 3 bay lights + status LED flashing rapidly

## Root Cause

### Gaming PC: Auto-Login Registry Values Missing

Docker Desktop is a **user-level startup item** (`HKCU\Run`) — it only starts after a user logs in. ADR-015 prescribed auto-login via registry, but the critical registry values were missing:

| Key | Expected | Actual at time of outage |
|-----|----------|-------------------------|
| `AutoAdminLogon` | `1` | *(empty)* |
| `DefaultUserName` | `<GAMING_PC_USER>` | *(empty)* |
| `DefaultPassword` | *(set)* | *(set)* |

Without auto-login: boot → lock screen → Docker Desktop never launches → all containers stay down.

The "Lock on Login" scheduled task was correctly configured and had worked on the previous reboot (1/31). The auto-login values were either never applied or cleared by a Windows Update.

### NAS: Three Separate Issues

**1. Pi-hole couldn't start — `ip_nonlocal_bind` not set**

The NAS Pi-hole binds to both `<NAS_IP>` (NAS IP) and `<VIP>` (VIP). Binding to the VIP requires `net.ipv4.ip_nonlocal_bind=1`, set by the `sysctl-init` container. But:

- QNAP has no persistent sysctl — values reset to 0 on every reboot
- `sysctl-init` has `restart: "no"` — it only runs during `docker compose up`, not on daemon restart
- After reboot, Docker restarted containers with `unless-stopped` policy, but did NOT re-run `sysctl-init`
- Pi-hole tried to bind to `<VIP>` with `ip_nonlocal_bind=0` → `bind: cannot assign requested address` → exit code 255
- Docker's restart backoff eventually stopped retrying

**2. SSH — `/share/homes` symlink missing**

- QNAP's home directory path `/share/homes` is normally a symlink to `/share/CACHEDEV1_DATA/homes`
- After the dirty reboot, this symlink was not recreated
- SSH daemon was running (port 22 responded after clicking Apply in QNAP UI) but key auth failed because `~/.ssh/authorized_keys` resolved to a nonexistent path
- Fix: `ln -s /share/CACHEDEV1_DATA/homes /share/homes`

**3. High CPU — RAID5 resync after dirty shutdown**

- `md1` (main data array, RAID5, 3 drives) started a full resync after the unclean shutdown
- Resync speed: ~52MB/s, estimated total time: ~16 hours
- This is expected and normal — do NOT interrupt it
- Glances also consuming 18-30% CPU on the ARM processor, compounding the load

## Diagnosis

### Gaming PC

```powershell
# Check if Docker Desktop is running
Get-Service *docker* | Format-Table Name, Status, StartType

# Check auto-login registry (DO NOT query DefaultPassword — it's plaintext)
Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' | Select-Object AutoAdminLogon, DefaultUserName

# Check boot events for unexpected shutdown
Get-WinEvent -LogName System -FilterXPath '*[System[(EventID=41 or EventID=6005 or EventID=6008)]]' -MaxEvents 5 | Select-Object TimeCreated, Id, Message
# EventID 41 = unexpected shutdown (power loss)
# EventID 6008 = previous shutdown was unexpected
```

### NAS

```bash
# Check if NAS is reachable
ping <NAS_IP>

# Check backup Pi-hole DNS
dig @<NAS_IP> google.com +short +time=3 +tries=1
# "connection refused" = container not running

# Check ip_nonlocal_bind (must be 1 for Pi-hole VIP binding)
cat /proc/sys/net/ipv4/ip_nonlocal_bind

# Check if /share/homes symlink exists
ls -la /share/homes

# Check RAID resync status
cat /proc/mdstat
# Look for "resync = XX%" on md1

# Check containers
export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:$PATH
DOCKER_HOST=unix:///var/run/system-docker.sock docker ps -a

# Check CPU consumers
top -b -n 1 | head -15
```

## Fix

### Gaming PC: Re-apply Auto-Login

Run in elevated PowerShell:
```powershell
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v AutoAdminLogon /t REG_SZ /d 1 /f
reg add "HKLM\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon" /v DefaultUserName /t REG_SZ /d "<GAMING_PC_USER>" /f

# Verify (DO NOT query DefaultPassword)
Get-ItemProperty -Path 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon' | Select-Object AutoAdminLogon, DefaultUserName
```

Then sign into the PC — Docker Desktop will auto-launch and containers will start.

### NAS: Restore SSH, sysctl, and Pi-hole

**Step 1: Fix SSH access** (if `/share/homes` is missing)
```bash
# From an existing NAS SSH session (password auth):
ln -s /share/CACHEDEV1_DATA/homes /share/homes
```

**Step 2: Re-run sysctl-init and start Pi-hole**
```bash
cd /share/CACHEDEV1_DATA/docker/pihole
export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:$PATH
DOCKER_HOST=unix:///var/run/system-docker.sock docker compose up -d sysctl-init
DOCKER_HOST=unix:///var/run/system-docker.sock docker start pihole
```

**Step 3: Verify**
```bash
dig @<NAS_IP> google.com +short
# Should return an IP address
```

### NAS: RAID Resync — Wait It Out

Monitor progress with `cat /proc/mdstat`. Do NOT reboot the NAS until resync completes. CPU usage will drop to normal levels once the resync finishes.

## Prevention

- **Check auto-login after Windows Updates**: Windows Updates can clear `AutoAdminLogon`. After major updates, verify the registry value is still set to `1`.
- **BIOS auto-restart**: Consider enabling "Restore on AC Power Loss" in Gaming PC BIOS so it turns on automatically after power outages.
- **NAS sysctl persistence**: The `sysctl-init` container with `restart: "no"` doesn't re-run after Docker daemon restarts. Consider either:
  - A QNAP autorun script that sets `ip_nonlocal_bind=1` at boot
  - Changing Pi-hole to only bind to `<NAS_IP>` (not the VIP) and letting keepalived handle VIP traffic
- **NAS `/share/homes` symlink**: May need to be recreated after dirty reboots. Check QNAP "Home Folders" setting under Control Panel → Privilege → Users.
- **UPS**: A small UPS for the NAS and Pi would prevent dirty shutdowns and RAID resyncs entirely.

## Open Items

- [x] Gaming PC: Auto-login verified — registry values survived reboot, Docker Desktop started automatically, all 14 containers up
- [x] NAS: nebula-sync TLS error — Caddy on Pi intercepted port 80, redirected to HTTPS. Fixed by pointing PRIMARY to `http://<RPI_IP>:8088` (Pi-hole's direct port)
- [x] NAS: RAID resync completed overnight (~16 hours total). Load average dropped from ~5 to ~2.
- [x] NAS: Glances CPU fixed — disabled processlist/programlist plugins and increased refresh to 5s. CPU dropped from 39.5% to 1.9%, RAM from 139MB to 67MB

## Timeline

- ~9:42 AM — Power blip, all devices lose power
- ~10:00 AM — NAS reboots automatically; RAID5 resync begins; Pi-hole fails to start (sysctl not set); SSH accessible but key auth broken (/share/homes missing)
- ~2:38 PM — User manually presses Gaming PC power button, boots to lock screen
- ~4:30 PM — Investigation begins via SSH
- ~4:45 PM — Auto-login registry fix applied to Gaming PC
- ~5:45 PM — NAS SSH restored (re-applied key, created /share/homes symlink)
- ~5:50 PM — NAS Pi-hole restored (re-ran sysctl-init, started container, DNS verified)
- ~5:50 PM — RAID resync at 58.7%, ~8.5 hours remaining — CPU will normalize after completion
- ~6:36 PM — nebula-sync fixed (PRIMARY URL updated to port 8088 to bypass Caddy), sync completed successfully
- ~12:00 AM (Feb 14) — RAID resync completed, load average normalized (~2.25)
