# Network Configuration

Read this file when doing network-related tasks (IP changes, SSH access, mounts, etc.)

**Note:** All IPs and usernames below use placeholders. See `.env.local` for actual values.

## Device IPs

| Device | IP Variable | Access |
|--------|-------------|--------|
| Router/Gateway | `<ROUTER_IP>` | Web UI |
| Raspberry Pi | `<RPI_IP>` | SSH |
| Gaming PC | `<GAMING_PC_IP>` | SSH |
| QNAP NAS | `<NAS_IP>` | SSH, Web UI, SMB |
| Pi-hole DNS | `<RPI_IP>` | Web UI :80/admin |
| Pi-hole DNS (backup) | `<NAS_IP>` | Web UI :8089/admin |
| Pi-hole VIP | `<VIP>` | Virtual IP (Keepalived HA) |

## SSH Commands

```bash
# Raspberry Pi
ssh <RPI_USER>@<RPI_IP>

# Gaming PC (quotes required if username has space)
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>

# QNAP NAS
ssh <NAS_USER>@<NAS_IP>
```

## Gaming PC SSH Notes

The Gaming PC runs Windows with OpenSSH. Important notes for automation:

**Mapped drives don't work in SSH sessions:**
Windows mapped drives (Z:, etc.) are user-session specific and not available via SSH.
Docker Desktop also can't access mapped drives (runs in WSL2).

**To access NAS from Gaming PC via SSH, use UNC paths with authentication:**
```cmd
# First authenticate (required before each command group)
net use \\<NAS_IP>\Media /user:<NAS_USER> <password>

# Then use UNC paths directly
dir \\<NAS_IP>\Media\immich
copy file.txt \\<NAS_IP>\Media\destination\
```

**PowerShell tips:**
```powershell
# Include hidden files in counts (files starting with .)
Get-ChildItem -Recurse -Force 'path' -File

# Run PowerShell commands via SSH
ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "powershell -Command \"Your-Command\""
```

**Docker uses CIFS volumes for NAS access:**
See `gaming-pc/docker/immich/docker-compose.yml` for the nas-immich volume configuration.

## Network Mounts

**Pi → Gaming PC:**
```
//<GAMING_PC_IP>/Server_Data → /home/<RPI_USER>/pc_storage
Credentials: /home/<RPI_USER>/.smbcredentials
```

**Pi → NAS:**
```
//<NAS_IP>/Backups → /home/<RPI_USER>/nas_backups
Credentials: /home/<RPI_USER>/.nas_smbcredentials
```
Used for VaultWarden daily backups (ADR-013).

**NAS SMB shares:**
```
smb://<NAS_IP>/Backups
smb://<NAS_IP>/Media
smb://<NAS_IP>/Logs
```

## DHCP/DNS

- **DHCP Server**: Xfinity gateway (`<ROUTER_IP>`)
- **DNS Server**: Pi-hole (`<RPI_IP>`), fallback 8.8.8.8
- **DNS VIP**: `<VIP>` — Keepalived Virtual IP shared between Pi (MASTER, priority 150) and NAS (BACKUP, priority 100). Devices should query this IP for automatic failover.
- **NAS DNS**: Pi-hole primary, 8.8.8.8 secondary

### Keepalived HA

Pi-hole DNS has automatic failover via Keepalived VRRP:

```
Normal (Pi healthy):                    Failover (Pi down):
  All devices → <VIP> (VIP)           All devices → <VIP> (VIP)
                   │                                       │
                   ▼                                       ▼
         Pi (<RPI_IP>)                            NAS (<NAS_IP>)
         Keepalived MASTER                        Keepalived MASTER
         Pi-hole native                           Pi-hole Docker
```

- **VIP**: `<VIP>` (outside DHCP ranges)
- **Health check**: DNS query every 2s, failover after 2 consecutive failures (~5s)
- **Failback**: Automatic when Pi recovers (higher priority)
- **VRRP mode**: Unicast between Pi and NAS

## Hardware Connections

```
Xfinity Router (<ROUTER_IP>)
    │
    └── TrendNet 2.5G Switch
            ├── Raspberry Pi (Ethernet, <RPI_IP>)
            ├── Gaming PC (Ethernet, <GAMING_PC_IP>)
            └── QNAP NAS (2.5GbE, <NAS_IP>)
```
