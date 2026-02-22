# ADR-032: Pre-built Caddy Docker Image Over Building from Source

**Status:** Accepted
**Date:** 2026-02-12
**Relates to:** ADR-031 (Reverse Proxy with Caddy and Split-Horizon DNS)

## Context

Caddy's Cloudflare DNS plugin is not included in the official `caddy:2` Docker image. It must be compiled in via [xcaddy](https://github.com/caddyserver/xcaddy), which performs a full Go build of Caddy with the specified modules.

The initial plan (ADR-031) used a custom multi-stage Dockerfile:

```dockerfile
FROM caddy:2-builder AS builder
RUN xcaddy build --with github.com/caddy-dns/cloudflare

FROM caddy:2
COPY --from=builder /usr/bin/caddy /usr/bin/caddy
```

This build was attempted on the Raspberry Pi (ARM Cortex-A55, 1GB RAM) and ran for over an hour before being killed. The Go linker stage alone consumed most of available memory, forcing heavy swap usage (730MB of 905MB swap). CPU time accumulated at ~3 seconds per 2 minutes of wall time due to swap thrashing.

## Decision

Use the community-maintained `caddybuilds/caddy-cloudflare` Docker image instead of building from source.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| **Pre-built image** (chosen) | Fast pull (~30s), no build resources needed, easy updates via `docker pull`, Watchtower-compatible | Depends on community maintainer |
| **Build on Pi** | Full control over build | Infeasible — 1GB RAM causes hours-long swap thrashing |
| **Build on MacBook, transfer** | Full control, fast build (same ARM64 arch) | MacBook doesn't have Docker Desktop installed; adds manual transfer step |
| **Build on NAS, transfer** | Same arch (aarch64) | NAS can't run `docker build` (permission denied — see MEMORY.md) |

### Why `caddybuilds/caddy-cloudflare`

- Multi-arch support (amd64, arm64, arm/v7) — works on Pi
- Actively maintained with automated rebuilds when Caddy or the Cloudflare plugin release new versions
- Published on both Docker Hub and GitHub Container Registry
- If this image is ever abandoned, several alternatives exist (`iarekylew00t/caddy-cloudflare`, `slothcroissant/caddy-cloudflaredns`)

## Consequences

**Positive:**
- Caddy deployment takes ~30 seconds (image pull) instead of hours (Go build)
- Updates are a simple `docker compose pull && docker compose up -d`
- Watchtower can auto-update the image (same as other containers)
- Freed ~3GB disk space on Pi (no build cache, no Go toolchain layers)

**Negative:**
- Dependent on a third-party image maintainer — if abandoned, must switch to another pre-built image or install Docker on MacBook to build locally
- Less control over exact Caddy version and plugin versions included

**Mitigation:**
- If the image is ever abandoned, build on the MacBook (same ARM64 arch) and transfer via `docker save | docker load` — same pattern used for the NAS (ADR-031)
