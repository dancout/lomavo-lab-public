---
name: commit
description: Pre-commit documentation verification and commit
auto_invoke: When the user asks to commit changes or says "commit"
arguments: Optional commit message override
---

# /commit — Pre-Commit Verification & Commit

Verify documentation is in sync per CONTRIBUTING.md, then create a clean commit.

## Steps

### 1. Assess Changes

Inspect what's staged and unstaged:

```
${{ git status }}
```

```
${{ git diff --stat }}
```

```
${{ git diff --cached --stat }}
```

Recent commit style for reference:

```
${{ git log --oneline -5 }}
```

### 2. Pre-Commit Documentation Check

Based on the changes in the diff, verify each applicable item from CONTRIBUTING.md:

**Task tracking (if features were completed):**
- [ ] `next-steps.md` — completed items removed from Active/Backlog
- [ ] Relevant `plans/*.md` topic file — completed items checked off
- [ ] `completed.md` — summary added (for significant features)

**Decision records (if non-obvious decisions were made):**
- [ ] ADR created in `decisions/ADR-XXX-<name>.md`
- [ ] `decisions/README.md` index updated

**Configuration (if services or configs changed):**
- [ ] `.env.example` updated if new environment variables added
- [ ] `infrastructure/services.md` updated if services changed
- [ ] Machine README updated if setup/config changed
- [ ] `README.md` updated if services, architecture, or tech stack changed

**Observability (if new service added):**
- [ ] Homepage widget added
- [ ] Uptime Kuma entry communicated to user

Report gaps found. If gaps exist, list them clearly and ask whether to fix them or proceed anyway.

### 3. Stage and Commit

- Stage files explicitly by name — NEVER use `git add -A` or `git add .`
- NEVER stage `.env` or `.mcp.json` or other files containing secrets
- If the user provided a commit message argument, use it
- Otherwise, draft a concise commit message from the diff (1-2 sentences, "why" not "what")
- Follow the commit message style from recent git log
- End the commit message with: `Co-Authored-By: Claude <noreply@anthropic.com>`
