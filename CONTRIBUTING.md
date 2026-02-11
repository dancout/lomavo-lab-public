# Contributing / Feature Completion Checklist

**IMPORTANT: Read this file before merging any feature branch.**

## Feature Branch Workflow

### 1. Starting Work
- [ ] Read `next-steps.md` for current priorities
- [ ] Create feature branch: `git checkout -b feature/<name>`
- [ ] If complex, create an implementation plan in the relevant directory (e.g., `gaming-pc/<feature>-plan.md`)

### 2. During Development
- [ ] Update implementation plan as work progresses (mark phases complete)
- [ ] Note any significant decisions made (for ADRs later)
- [ ] Commit regularly with clear messages

### 3. Before Merging - Documentation Checklist

**Task Tracking (keep these files in sync):**
- [ ] Update `next-steps.md` - remove completed items from Active/Backlog
- [ ] Update `future-plans.md` - check off completed items in the relevant phase
- [ ] Update `completed.md` - add summary of completed work (for significant features)
- [ ] Update implementation plan to show all phases complete (if one exists)

See "Task File Sync Process" below for details.

**Decision Records (if significant decisions were made):**
- [ ] Create ADR in `decisions/ADR-XXX-<name>.md`
- [ ] Update `decisions/README.md` index table with new ADR
- [ ] ADRs are needed for:
  - Architecture choices (e.g., where to store data, which technology to use)
  - Non-obvious technical decisions (e.g., workarounds for platform limitations)
  - Trade-offs made (e.g., security vs convenience)
  - Decisions that future-you would ask "why did we do it this way?"

**Configuration Updates:**
- [ ] Update `.env.example` files if new environment variables were added
- [ ] Update `docker-compose.yml` files in repo if changed on actual machines
- [ ] Update `infrastructure/network.md` if IPs, SSH, or mounts changed
- [ ] Update `infrastructure/services.md` if services were added/modified

**Machine-Specific Docs:**
- [ ] Update relevant `README.md` (rpi/, gaming-pc/, nas/) if setup changed

### 4. Merge
```bash
git checkout main
git pull
git merge feature/<name> --no-ff -m "Merge feature/<name>

<summary of changes>
"
git push
```

### 5. Cleanup
- [ ] Delete feature branch locally: `git branch -d feature/<name>`
- [ ] Delete remote if needed: `git push origin --delete feature/<name>`

## ADR Quick Template

```markdown
# ADR-XXX: Title

**Status:** Accepted
**Date:** YYYY-MM-DD

## Context
What prompted this decision?

## Decision
What did we decide?

## Consequences
**Positive:** Benefits
**Negative:** Trade-offs
```

## Task File Sync Process

Three files track work at different levels. Keep them in sync:

| File | Purpose | Scope |
|------|---------|-------|
| `next-steps.md` | Current sprint / immediate tasks | What to work on NOW |
| `future-plans.md` | Long-term phased roadmap | Full project phases with checkboxes |
| `completed.md` | Archive of completed work | Historical record of achievements |

**Workflow:**

1. **Starting a session**: Check `next-steps.md` for current priorities
2. **Need more work?**: Pull items from `future-plans.md` into `next-steps.md`
3. **Completing work**:
   - Remove from `next-steps.md` (or move out of Active Work)
   - Check off in `future-plans.md` (the item should exist in a phase)
   - Add summary to `completed.md` (for significant features)

**Periodic maintenance:**
- If `next-steps.md` backlog is empty, pull next items from `future-plans.md`
- If a phase in `future-plans.md` is complete, note it and move to next phase
- Keep `completed.md` organized by month/milestone

## Common Mistakes to Avoid

1. **Forgetting ADRs** - If you made a technical decision that wasn't obvious, document it
2. **Forgetting to update the ADR index** - `decisions/README.md` must list all ADRs
3. **Not syncing task files** - Update all three: next-steps, future-plans, completed
4. **Not updating .env.example** - If you added secrets, add placeholders to the template
5. **Leaving implementation plans incomplete** - Mark all phases as done
