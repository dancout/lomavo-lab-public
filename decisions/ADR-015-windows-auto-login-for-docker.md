# ADR-015: Windows Auto-Login for Docker Desktop Startup

**Status:** Accepted
**Date:** 2026-01-31

## Context

Docker Desktop on Windows runs as a user application, not a system service. This means Docker containers (Immich, Jellyfin, Glances) don't start until a user logs into the Gaming PC. After power outages or reboots, services remain offline until manual intervention.

Options considered:
1. **Windows Auto-Login** - Simple, reliable, standard Windows feature
2. **Docker Engine via WSL2** - Can run as service, but requires migrating all compose files to WSL paths and losing Docker Desktop GUI
3. **Manual login after each reboot** - Status quo, unreliable for homelab

## Decision

Enable Windows auto-login with immediate screen lock:

1. **Registry auto-login settings** (`HKLM\...\Winlogon`):
   - `AutoAdminLogon = 1`
   - `DefaultUserName = <GAMING_PC_USER>`
   - `DefaultPassword = <password>`

2. **Scheduled task "Lock on Login"**: Runs `rundll32.exe user32.dll,LockWorkStation` at logon to immediately lock the screen

This allows Docker Desktop to start automatically while keeping the screen locked.

## Consequences

**Positive:**
- Docker services start automatically after reboot without manual intervention
- Screen remains locked for casual physical security
- Simple solution using standard Windows features
- No changes needed to Docker compose files or workflows

**Negative:**
- Password stored in plaintext in registry (readable by admin accounts, recovery environments)
- Anyone with physical access and technical knowledge could extract the Windows password
- If password is reused elsewhere, those accounts become vulnerable

**Mitigations:**
- Use a unique password for this Windows account
- Gaming PC is on local network only, registry not exposed remotely
- Lock screen still prevents casual unauthorized use

**Alternative for higher security:** Use `netplwiz` method which stores credentials encrypted via DPAPI (still extractable by determined attacker with admin access, but marginally better).
