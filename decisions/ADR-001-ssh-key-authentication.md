# ADR-001: SSH Key Authentication for Pi

**Status:** Accepted
**Date:** 2026-01-28

## Context

Claude Code needed to SSH into the Raspberry Pi to document docker configurations and apply changes. Password-based SSH requires interactive input (via `expect` or `sshpass`), which proved unreliable due to ANSI escape codes and prompt matching issues.

## Decision

Use SSH key-based authentication instead of passwords:
1. Generate ed25519 key on Mac: `ssh-keygen -t ed25519`
2. Copy to Pi: `ssh-copy-id <RPI_USER>@<RPI_IP>`
3. Access via: `ssh <RPI_USER>@<RPI_IP> "command"`

## Consequences

**Positive:**
- Claude Code can run remote commands directly without interactive password handling
- More secure than password auth (no credentials in scripts)
- Simpler command syntax: `ssh user@host "command"`

**Negative:**
- SSH key must exist on any machine that needs Pi access
- Key must be protected (not shared/committed)

**Notes:**
- Pi credentials still stored in `.env` for reference
- Future: Set up SSH keys for Gaming PC and NAS
