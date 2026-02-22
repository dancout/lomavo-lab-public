# ADR-037: Environment Variable Standardization (`.env.local` → `.env`)

**Status:** Accepted
**Date:** 2026-02-22

## Context

The repo was using `.env.local` as the template for local environment variables (copied from `.env.local.example`). This pattern is non-standard:

- **Industry standard**: `.env` is the conventional name for local environment configuration across most tools and frameworks (Docker, Next.js, Rails, Node.js, Python, etc.)
- **Tooling expectations**: Most `.env` loaders and CLI tools default to `.env`, not `.env.local`
- **Clarity**: `.env` makes the intent clearer ("this is THE environment config"), whereas `.env.local` implies "local override of a base .env"
- **Contributor confusion**: New contributors might assume there's a `.env` file somewhere they're missing

The original choice of `.env.local` was likely influenced by some frameworks (like Next.js) that use `.env.local` for local overrides, but this repo has no committed `.env` file with defaults — the entire config is in the local file, making `.env` the more appropriate choice.

## Decision

Standardize on `.env` as the template and local configuration filename:

1. Rename `.env.local.example` → `.env.example`
2. Update `.gitignore` to ignore `.env` (not `.env.local`)
3. Update all documentation, scripts, and deployment tooling to reference `.env`
4. Users copy `.env.example` to `.env` and fill in values (not `.env.local`)

## Consequences

**Positive:**
- Aligns with industry standard practice
- Better tooling compatibility (most `.env` loaders default to `.env`)
- Clearer intent for new contributors and forks
- Simpler to explain: "copy `.env.example` to `.env`"
- Consistency with Docker Compose conventions

**Negative:**
- One-time manual migration for existing users with `.env.local` (need to rename to `.env`)
- All deployment scripts, setup helpers, and documentation needed updating (all completed)

## Implementation

**Files renamed:**
- `.env.local.example` → `.env.example`

**Files updated:**
- `.gitignore` — changed to ignore `.env` instead of `.env.local`
- All script references (setup, deploy, validation):
  - `scripts/new-user-setup.sh` — copies `.env.example` → `.env`
  - `check-secrets.sh` — reads from `.env` for leak detection
  - `sync-to-public.sh` — validates `.env` values don't leak
  - `nas/docker/prometheus/deploy.sh` — loads from `.env`
- All documentation references (CLAUDE.md, GETTING_STARTED.md, infrastructure docs, machine READMEs, reference docs, skill files)

**User migration path:**
- Existing users with `.env.local`: rename to `.env` once
- New users: run `scripts/new-user-setup.sh` which copies `.env.example` → `.env`

## Related ADRs

- **ADR-018** (Sensitive Data Placeholders): Documents the use of placeholders + `.env` for secrets (now using `.env` instead of `.env.local`)
