---
name: doc-update
description: Post-change documentation sync across all tracking files
auto_invoke: After implementing changes that affect documentation
arguments: Description of what changed (required)
---

# /doc-update — Post-Change Documentation Sync

Ensure all documentation is consistent after a change. Takes a description of what changed as argument.

## Steps

### 1. Determine Change Type

From the argument, classify the change against the documentation update rules:

| Change Type | Files to Update |
|-------------|----------------|
| New service | `infrastructure/services.md`, machine README, Homepage, Uptime Kuma |
| New container | Machine README (directory structure, env vars) |
| Script changes | Machine README (document new features/behavior) |
| New environment variable | `.env.example` in relevant directory |
| Architectural decision | `decisions/ADR-XXX-*.md`, `decisions/README.md` |
| Network/IP/mount changes | `infrastructure/network.md` |
| Service added/removed/moved | `README.md` architecture diagram + status section |
| Incident diagnosed & resolved | `runbooks/RB-XXX-*.md`, `runbooks/README.md` |

### 2. Sync Task Files

Read and update all three task tracking files:

```
${{ cat next-steps.md }}
```

```
${{ cat plans/README.md }}
```

- **next-steps.md** — remove completed items from Active/Backlog
- **Relevant `plans/*.md` topic file** — check off completed items in the relevant topic
- **completed.md** — add summary of completed work (significant features only)

### 3. Check ADR Need

An ADR is warranted if:
- A non-obvious technical decision was made
- There was a choice between alternatives
- Future-you would ask "why did we do it this way?"
- A workaround or tradeoff was accepted

If an ADR is needed, create it using the template from CONTRIBUTING.md and update `decisions/README.md`.

### 4. Cross-Check All Documentation Layers

Verify every applicable layer was updated. Skip layers that aren't affected — but check each one:

**Project-level (if architecture, services, or tech stack changed):**
- [ ] `README.md` — architecture diagram, service counts, status section, tech stack table

**Infrastructure (if services, network, or configs changed):**
- [ ] `infrastructure/services.md` — service inventory, ports, machine assignment
- [ ] `infrastructure/network.md` — IPs, SSH commands, mount paths

**Machine-specific (if machine setup or containers changed):**
- [ ] `rpi/README.md`, `gaming-pc/README.md`, `nas/README.md` — services table, directory structure, env vars, directory mapping

**Decision records (if non-obvious decisions were made):**
- [ ] `decisions/ADR-XXX-*.md` + `decisions/README.md`

**Runbooks (if an incident was diagnosed and resolved):**
- [ ] `runbooks/RB-XXX-*.md` + `runbooks/README.md`

**Task tracking (handled in Step 2, confirm here):**
- [ ] `next-steps.md` — completed items removed
- [ ] `plans/*.md` — completed items checked off
- [ ] `completed.md` — summary added

Report what was updated, what was already correct, and what was skipped (not applicable).
