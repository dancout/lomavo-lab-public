---
name: secrets-check
description: Scan tracked files for exposed sensitive values from .env
auto_invoke: false
arguments: "Optional: --verbose for line-level detail"
---

# /secrets-check — Sensitive Value Exposure Scan

Scan all git-tracked files for hardcoded IPs, usernames, domains, tokens, and other sensitive values that should use `<PLACEHOLDER>` format per ADR-018.

## What It Checks

The script reads `.env` and greps tracked files for real values of these keys:

| Category | Keys |
|----------|------|
| **IPs** | `RPI_IP`, `GAMING_PC_IP`, `NAS_IP`, `MACBOOK_IP`, `ROUTER_IP`, `VIP` |
| **Usernames** | `RPI_USER`, `GAMING_PC_USER`, `NAS_USER`, `GITHUB_USER` |
| **URLs/Domain** | `DOMAIN`, `STATUS_URL`, `PHOTOS_URL`, `HOMEPAGE_ALLOWED_HOSTS` |
| **Tokens** | `UPTIME_KUMA_PUSH_TOKEN`, `CLOUDFLARE_API_TOKEN`, `QDRANT_API_KEY` |
| **Paths** | `REPO_PATH`, `SSH_KEY_DIR` |

### False Positive Handling

- **Port numbers** are not checked (exposing `3000` or `8088` is fine)
- **Very short values** (3 chars or less) are skipped
- **Software names** matching usernames (e.g., `pi-hole` = Pi-hole software) are skipped
- **IP substring matching** uses word boundaries (e.g., example IPs like `10.x.x.x` won't match substrings in other IPs)

## Steps

### 1. Run the Check Script

```bash
./check-secrets.sh
```

Report the output to the user. If clean, confirm no leaks found.

### 2. If Leaks Found

Run verbose mode to see exact lines:

```bash
./check-secrets.sh --verbose
```

For each exposed key, present a table:

| Key | File | Line | Action Needed |
|-----|------|------|---------------|
| ... | ... | ... | Replace with `<PLACEHOLDER>` or `${VAR}` |

**Replacement patterns by file type:**
- **Documentation** (`.md`, ADRs, runbooks): Use `<PLACEHOLDER>` format (e.g., `<RPI_IP>`)
- **Docker-compose** (`.yml` configs): Use `${VAR}` with env var in `.env` file
- **Comments**: Use generic examples (e.g., `10.x.x.x` instead of real IP)
- **`.env.example`**: Use `yourdomain.com` or leave blank

### 3. Fix and Re-verify

After fixing, re-run `./check-secrets.sh` to confirm clean.

If the user wants to also sync to the public repo, remind them:

```bash
./sync-to-public.sh
```

## When to Run This

- Before pushing to remote
- After adding new documentation or config files
- After writing runbooks or ADRs that reference infrastructure
- As part of the `/commit` workflow (optional)
- Anytime you want peace of mind

## Adding New Sensitive Keys

If a new secret type is added to `.env`:
1. Add the key name to `SENSITIVE_KEYS` in both `check-secrets.sh` and `sync-to-public.sh`
2. Add to `.env.example` so others know the variable exists
