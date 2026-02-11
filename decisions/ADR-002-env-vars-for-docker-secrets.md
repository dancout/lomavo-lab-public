# ADR-002: Environment Variables for Docker Secrets

**Status:** Accepted
**Date:** 2026-01-28

## Context

Docker-compose files on the Pi contained hardcoded secrets (Cloudflare tunnel tokens, IP addresses). Committing these to version control would expose sensitive data.

## Decision

1. Replace hardcoded secrets with `${VAR}` references in docker-compose files
2. Create `.env` files on target machines with actual values
3. Track only `.env.example` templates in version control
4. Docker Compose automatically loads `.env` from the same directory

Example:
```yaml
# Before (insecure)
command: tunnel run --token eyJhIjoiOTQy...

# After (secure)
command: tunnel run --token ${CLOUDFLARE_TUNNEL_TOKEN}
```

## Consequences

**Positive:**
- Secrets never appear in git history
- Same docker-compose files work across environments
- Clear documentation of required variables via `.env.example`

**Negative:**
- Must manually create `.env` on each target machine
- Must keep `.env` in sync if variables change

**Variables currently in use:**
- `CLOUDFLARE_TUNNEL_TOKEN` - Cloudflare tunnel authentication
- `RPI_IP` - Raspberry Pi IP address for allowed hosts
