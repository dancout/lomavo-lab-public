# ADR-006: Windows OpenSSH Setup for Gaming PC

**Status:** Accepted
**Date:** 2026-01-28

## Context

Needed SSH access to the Gaming PC (Windows 10) for Claude Code to document and manage docker configurations, similar to how we access the Raspberry Pi.

## Decision

Enable and configure OpenSSH Server on Windows 10 with SSH key authentication.

### Installation Steps

1. **Install OpenSSH Server** (PowerShell as Admin):
   ```powershell
   Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
   ```

2. **Start and enable the service**:
   ```powershell
   Start-Service sshd
   Set-Service -Name sshd -StartupType 'Automatic'
   ```

3. **Test connection from Mac**:
   ```bash
   ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>
   ```
   Note: Username with space requires quotes.

### SSH Key Authentication (Windows Admin Users)

Windows handles SSH keys differently for admin users. The standard `~/.ssh/authorized_keys` is ignored.

1. **Get public key from Mac**:
   ```bash
   cat ~/.ssh/id_ed25519.pub
   ```

2. **On Windows (via SSH session)**, write key to admin location:
   ```cmd
   echo ssh-ed25519 AAAA...FULL_KEY... > C:\ProgramData\ssh\administrators_authorized_keys
   ```

3. **Fix permissions**:
   ```cmd
   icacls C:\ProgramData\ssh\administrators_authorized_keys /inheritance:r /grant "Administrators:F" /grant "SYSTEM:F"
   ```

Note: `ssh-copy-id` does NOT work for Windows admin users because it writes to the wrong location.

## Connection Details

- **Host**: `<GAMING_PC_IP>` (see `.env.local`)
- **Username**: `<GAMING_PC_USER>` (requires quotes due to space)
- **Auth**: SSH key (id_ed25519)
- **Command**: `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>`

## Consequences

**Positive:**
- Claude Code can now access Gaming PC docker configs
- Consistent SSH-based workflow across all machines
- No password needed for automation

**Negative:**
- Windows SSH quirks (admin authorized_keys location, username quoting)
- Must remember different path for keys on Windows

## Notes

- Windows uses `dir` instead of `ls`, `cmd` syntax instead of bash
- Docker files are on D: drive, not C: drive
- Notepad and other GUI apps don't work over SSH
