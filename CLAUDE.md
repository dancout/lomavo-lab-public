# CLAUDE.md

Guidance for Claude Code when working with this repository.

## Project Overview

**Documentation repository** for the lomavo homelab. Tracks configurations, decisions, and plans for personal home infrastructure. No code to build/test - manages documentation, docker-compose files, and architectural decisions.

**Owner**: Senior developer (10 years: Angular, Python, Node, Flutter), new to homelabbing, prefers strongly typed languages.

## What You Can Do (Without Asking)

You have SSH access to all machines. Use it proactively.

**Get actual IPs/usernames:** Read `.env` (or check `.env.example` for structure).

| Machine | SSH Command | Common Tasks |
|---------|-------------|--------------|
| Raspberry Pi | `ssh <RPI_USER>@<RPI_IP>` | Deploy configs, restart containers, check logs |
| Gaming PC | `ssh "<GAMING_PC_USER>"@<GAMING_PC_IP>` | Run PowerShell, manage Docker, check services |
| NAS | `ssh <NAS_USER>@<NAS_IP>` | Check storage, manage Glances container |

**Do these without asking:**
- Retrieve credentials from machines (see `reference/credentials.md`)
- Deploy updated configs via SCP/SSH (see `reference/deploy-commands.md`)
- Restart services after config changes
- Check service status and logs
- Run diagnostic commands

**ASK FIRST for security changes:**
- Firewall rules (opening/closing ports)
- SSH configuration changes
- Network exposure changes
- New services that listen on ports

## Design Principles

See `reference/design-principles.md` for homelab pillars and technical principles.

## Research Guidelines

- **Self-hosted docs first** — when investigating service features, check self-hosted/open-source documentation, not cloud/SaaS docs. Previous Qdrant research conflated cloud and self-hosted capabilities.
- **Check deployed versions** — don't assume latest. Check the machine README or `docker inspect` for the actual running version before recommending features.

## What to Read When

| Task | Read First | Why |
|------|-----------|-----|
| Starting a session | `next-steps.md` + `HOMELAB_PROFILE.md` (if it exists) | Current priorities + hardware context |
| Planning future work | `plans/README.md` | Phased roadmap index with topic files |
| Adding/modifying a service | `infrastructure/services.md` | What runs where |
| **Implementing a plan / adding a service** | **`CONTRIBUTING.md` → New Service Deployment Checklist** | **Don't miss prerequisites, Homepage, Uptime Kuma, alerting** |
| Deploying to a machine | Machine README + `reference/deploy-commands.md` | Deploy commands, directory mappings |
| Network/SSH/mounts | `infrastructure/network.md` | IPs, SSH commands, mount paths |
| Understanding past decisions | `decisions/README.md` | ADR index with summaries |
| Diagnosing an outage/issue | `runbooks/README.md` | Past incidents with diagnosis steps and fixes |
| Looking for a file | `reference/file-organization.md` | Repo structure |
| Finding a credential | `reference/credentials.md` | Where secrets live |
| Checking service ports | `infrastructure/services.md` | Full port inventory |
| Understanding this homelab's hardware/goals | `HOMELAB_PROFILE.md` | User's hardware context |
| Updating instructions/memory | `reference/writing-instructions.md` | Rules for maintaining docs |
| **Before merging** | **`CONTRIBUTING.md`** | **MANDATORY checklist** |

## Documentation Update Rules

When you make changes, update docs based on what changed:

| Change Type | Update These Files |
|-------------|-------------------|
| New service | `infrastructure/services.md`, machine `README.md`, add to Uptime Kuma + Homepage |
| New container | Machine `README.md` (directory structure, environment vars) |
| Script changes | Machine `README.md` (document new features/behavior) |
| New environment variable | `.env.example` in relevant directory |
| Architectural decision | Create `decisions/ADR-XXX-*.md`, update `decisions/README.md` index |
| Network/IP/mount changes | `infrastructure/network.md` |
| New/removed service or major feature | `README.md` (architecture diagram, service counts, tech stack, status) |

**When to create an ADR:**
- Non-obvious technical decisions (workarounds, tradeoffs)
- "Why did we do it this way?" questions
- Choosing between alternatives
- When in doubt, create one

## Writing Plans

Plans survive context clearing — invest tokens in context upfront rather than assuming the next session has prior context.

- **Include why this work matters** — not just what to build, but the motivation
- **Document what exists today** — current state, relevant files, deployed versions
- **Reference relevant ADRs** — link decisions that constrain or inform the plan
- **List prerequisites** — credentials, user actions, manual setup steps
- **A new session reading the plan should understand the full picture** without re-reading other files

## Before Merging Checklist

**STOP. Read `CONTRIBUTING.md` and verify:**
- [ ] `next-steps.md` updated (completed items checked, new items added)
- [ ] ADR created if significant decisions were made
- [ ] `decisions/README.md` index updated if ADR added
- [ ] `.env.example` updated if new secrets added
- [ ] `infrastructure/services.md` updated if services changed
- [ ] Machine `README.md` updated if setup/config changed
- [ ] Homepage widget added (if service has data to display)
- [ ] Uptime Kuma entry communicated to user (URL, type, keyword)
- [ ] Alerting covered (new Prometheus targets get "Scrape Target Down" for free)
- [ ] `README.md` updated if services, tech stack, or architecture changed
