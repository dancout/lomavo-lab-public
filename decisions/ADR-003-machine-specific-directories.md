# ADR-003: Machine-Specific Directory Structure

**Status:** Accepted
**Date:** 2026-01-28

## Context

The homelab spans multiple machines (Raspberry Pi, Gaming PC, NAS). Each has different services and configurations. Need a clear way to organize configs in the repo.

## Decision

Create top-level directories per machine:
```
/
├── rpi/                    # Raspberry Pi configs
│   ├── README.md           # Service overview, deployment docs
│   ├── .env.example        # Required environment variables
│   └── docker/             # Docker compose files
│       ├── uptime-kuma/
│       ├── vaultwarden/
│       └── ...
├── gaming-pc/              # Gaming PC configs (future)
└── nas/                    # NAS configs (future)
```

Each machine directory contains:
- `README.md` - What runs there, how to deploy
- `.env.example` - Template for secrets
- `docker/` - Docker compose files organized by service

## Consequences

**Positive:**
- Clear separation of concerns
- Easy to find configs for specific machines
- Each machine can have its own deployment workflow

**Negative:**
- Some duplication if services span machines
- Must remember to update correct directory

**Directory mapping (rpi):**
| Repo | Pi |
|------|-----|
| `rpi/docker/uptime-kuma/` | `/home/<RPI_USER>/docker/uptime-kuma/` |
| `rpi/docker/cloudflare/` | `/home/<RPI_USER>/cloudflare/` |
