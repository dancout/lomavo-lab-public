# Ideas & Backlog

Research ideas and cleanup tasks.

## Ideas to Research

- [ ] Organizr as alternative to Homepage (has SSO)
- [ ] SSH aliases for quick access to Pi/PC from MacBook
- [ ] Immich architecture: PC vs NAS as primary for uptime
- [ ] Refactor repo for "new user" onboarding — clear sections for hardware inventory, experience level, personal goals, and decoupled completed/next-steps (currently tied to one user's project)

## Backlog / Cleanup

- [ ] Investigate pc_storage mount on Pi (`/home/<RPI_USER>/pc_storage`)
  - Contains Immich encoded videos (~626GB)
  - Unclear if actively used or experimental
  - Determine if this should migrate to NAS or be removed
- [ ] Add `NEST_USER` to `.env` / `.env.example` — Nest account username not currently tracked anywhere in repo
