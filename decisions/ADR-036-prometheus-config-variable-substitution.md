# ADR-036: Prometheus Config Variable Substitution

**Status:** Accepted
**Date:** 2026-02-21

## Context

`prometheus.yml` contains machine IPs and the Qdrant Bearer API key. Prometheus has no native variable substitution (no `.env` support, no `${VAR}` resolution). The `prom/prometheus` image is BusyBox-based with no `envsubst`.

The repo version used `<PLACEHOLDER>` format while the deployed NAS config had real values hardcoded. This created a risk: if someone deployed the repo template directly via SCP, all scrape targets would break and the Qdrant Bearer token would be lost.

**Deployment model:** Variable substitution happens on a **deployment node** (currently MacBook, portable to Linux/WSL or future orchestration systems like Open Claw container). The node must have network access to NAS and `envsubst` available. The resolved config is then deployed to NAS.

This is consistent with ADR-002 (environment variables for secrets) and ADR-004 (version-controlled deploy workflow).

## Decision

Convert `prometheus.yml` to standard `${VAR}` format and create a deploy script (`deploy.sh`) that runs on the Mac (or any Unix system with `envsubst`) to:

1. Reads variables from repo-root `.env.local` using targeted `grep`+`eval` (avoids sourcing issues with unquoted spaces in `GAMING_PC_USER`)
2. Validates all required variables are set (`RPI_IP`, `GAMING_PC_IP`, `NAS_IP`, `NAS_USER`, `QDRANT_API_KEY`)
3. Runs `envsubst` with an explicit variable list (only replaces the 4 config vars)
4. Verifies no unresolved `${...}` remain
5. SCPs resolved config to NAS
6. Restarts Prometheus via SSH

## Alternatives Considered

| Alternative | Why Not |
|-------------|---------|
| `sed` with `<PLACEHOLDER>` | Fragile regex, inconsistent with `${VAR}` convention (ADR-002) |
| Docker entrypoint/init container | `prom/prometheus` has no `envsubst`; NAS Docker builds are problematic |
| `file_sd_configs` | Only solves target IPs, not the Bearer auth secret |
| `confd` / `consul-template` | Massive overkill for 1 config file |

## Consequences

**Positive:**
- Consistent with existing `${VAR}` convention (ADR-002) and deploy workflow (ADR-004)
- `envsubst` is a standard Unix tool (already on Mac; available on Linux/WSL)
- Single command deploys: `./nas/docker/prometheus/deploy.sh`
- Lightweight: no new project dependencies installed, no system config modified — just uses existing tools
- API key masked in output, temp file cleaned up via trap
- Unresolved variable check prevents broken deploys
- Script validates `envsubst` availability and provides install instructions if missing

**Negative:**
- Requires `envsubst` (GNU gettext) to be installed — not present on minimal systems
- Direct SCP of `prometheus.yml` will break — must use `deploy.sh` (documented with warnings)
- Adding new variables requires updating both the template and `deploy.sh`'s envsubst list

**Neutral:**
- `QDRANT_API_KEY` added to `.env.local` and `.env.local.example`
- Deployment script must run on a system with network access to NAS (Mac, Linux, or WSL)
