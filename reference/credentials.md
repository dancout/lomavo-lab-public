# Finding Credentials

**First:** Read `.env` for IPs and usernames. Then check machines for secrets:

| Credential | Location | Command |
|------------|----------|---------|
| NAS password | Gaming PC Immich `.env` | `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "type C:\Server_Data\Docker\immich\.env"` |
| Immich API keys | Pi Homepage `.env` | `ssh <RPI_USER>@<RPI_IP> "cat ~/homepage/.env"` |
| Pi service secrets | Pi `.env` files | `ssh <RPI_USER>@<RPI_IP> "cat ~/SERVICE_NAME/.env"` |
| SMB credentials | Pi home | `ssh <RPI_USER>@<RPI_IP> "cat ~/.smbcredentials"` |
| Grafana admin password | NAS Grafana `.env` | `ssh <NAS_USER>@<NAS_IP> "cat /share/CACHEDEV1_DATA/docker/grafana/.env"` |
| Paperless admin | Vaultwarden | admin / PaperlessAdmin2026 |
| Paperless API token | Gaming PC MCP `.env` | `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP> "type C:\Server_Data\Docker\mcp-servers\.env"` |

**Security reminders:**
- NEVER query or display `DefaultPassword` from Windows Winlogon registry (plaintext)
- Don't fetch or display passwords/API keys unless the user explicitly asks
- Reference credentials generically ("your password") rather than querying and displaying them
