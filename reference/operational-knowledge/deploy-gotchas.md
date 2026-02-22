# Deploy Gotchas

Operational knowledge for deploying services across homelab machines.

## docker compose restart vs up -d

`docker compose restart` does NOT re-read `.env` files — it reuses the existing container with old environment variables. Use `docker compose up -d` when `.env` has changed (it will recreate the container). Only use `restart` for config file changes that are volume-mounted.

## Gaming PC Docker over SSH

Docker Desktop's credential store (`credsStore: desktop`) causes `docker pull` and `docker compose` to fail when run over SSH. Removing `credsStore` from `config.json` doesn't fix it — the credential store is baked into Docker Desktop.

**Rule:** Don't attempt `docker pull`/`docker compose build`/`docker compose up` on the Gaming PC over SSH. Give the user exact commands to run locally on the Gaming PC console. Read-only commands (`docker ps`, `docker inspect`, `curl`) work fine over SSH.

## .env File Corruption via PowerShell

PowerShell `Set-Content` can silently drop lines or change encoding when editing `.env` files via SSH. Discovered when MCP servers `.env` lost critical variables after a PowerShell edit.

**Rule:** Avoid `Set-Content`/`Get-Content` pipeline for `.env` edits over SSH. Use `echo >>` to append individual values, or have the user edit the file manually.

## Windows SCP Path Format

Use forward slashes for remote Windows paths in SCP: `scp file "user@host:C:/path/to/file"`. Backslash paths with quoting fail even with escaping.

## Pi Docker Build Limits

The Raspberry Pi has limited RAM (~1GB). Go builds (xcaddy, etc.) thrash swap and can take hours.

**Alternatives:**
- Use pre-built images when available (e.g., `caddybuilds/caddy-cloudflare`)
- Build on another ARM64 machine and transfer via `docker save | docker load`

## SSH Keys in Docker (Windows Host)

Windows `.ssh` directory mounted into a Linux container gets 0777 permissions. SSH refuses keys with permissions that are "too open."

**Fix:** Copy the key to `/tmp` with `chmod 600` in the container entrypoint:
```
command: ["sh", "-c", "cp /ssh/key /tmp/ssh_key && chmod 600 /tmp/ssh_key && SSH_KEY_PATH=/tmp/ssh_key exec node ..."]
```
