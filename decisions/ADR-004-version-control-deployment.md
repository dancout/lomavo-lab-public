# ADR-004: Version Control Deployment Workflow

**Status:** Accepted
**Date:** 2026-01-28

## Context

Need a reliable way to:
1. Track docker-compose changes in git
2. Deploy changes to target machines
3. Keep secrets secure
4. Roll back if something breaks

## Decision

**Workflow:**
1. Edit docker-compose files in repo (with `${VAR}` for secrets)
2. Commit and push changes
3. Copy files to target machine via `scp`
4. Restart containers with `docker compose down && docker compose up -d`

**Safety measures:**
- Backup original files before first migration (done for Pi)
- Test containers work before deleting backups
- `.env` files live only on target machines, never in repo

**Deployment commands:**
```bash
# Copy compose file to Pi
scp rpi/docker/SERVICE/docker-compose.yml <RPI_USER>@<RPI_IP>:/path/to/SERVICE/

# Restart service
ssh <RPI_USER>@<RPI_IP> "cd /path/to/SERVICE && docker compose down && docker compose up -d"
```

## Consequences

**Positive:**
- Git history tracks all config changes
- Can roll back by checking out previous commit
- Secrets never touch version control

**Negative:**
- Manual scp step (could automate later)
- Must remember exact paths on target machines

**Future consideration:**
- Could add deployment script or Makefile
- Could use git hooks for auto-deploy
