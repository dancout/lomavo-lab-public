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
- [ ] Update the relevant `plans/*.md` topic file — check off completed items
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
- [ ] Update `README.md` architecture diagram, service counts, and tech stack if services were added/removed

**Machine-Specific Docs:**
- [ ] Update relevant machine README (`rpi/`, `gaming-pc/`, `nas/`) if setup changed:
  - Services table entry for new/changed services
  - Directory structure updated if new directories created
  - Environment variables documented
  - Directory mapping (repo path → deployed path)

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
| `plans/README.md` + `plans/*.md` | Long-term phased roadmap | Phase index + topic files with checkboxes |
| `completed.md` | Archive of completed work | Historical record of achievements |

**Workflow:**

1. **Starting a session**: Check `next-steps.md` for current priorities
2. **Need more work?**: Pull items from `plans/*.md` topic files into `next-steps.md`
3. **Completing work**:
   - Remove from `next-steps.md` (or move out of Active Work)
   - Check off in the relevant `plans/*.md` topic file
   - Add summary to `completed.md` (for significant features)

**Periodic maintenance:**
- If `next-steps.md` backlog is empty, pull next items from `plans/README.md` → topic files
- If a phase is complete, update `plans/README.md` status
- Keep `completed.md` organized by month/milestone

## New Service Deployment Checklist

When adding a new service (container, exporter, integration), complete ALL applicable items:

**Before building:**
- [ ] Collect any credentials, API keys, or manual setup outputs the user must provide
- [ ] If the plan has prerequisites that require user action, walk them through it FIRST

**Code & config:**
- [ ] Create service files (code, Dockerfile, docker-compose.yml, .env.example)
- [ ] Deploy to target machine, verify endpoints work

**Observability:**
- [ ] Add Prometheus scrape job (if the service exposes metrics)
- [ ] Verify Prometheus target shows UP ("Scrape Target Down" alert covers reachability automatically)
- [ ] Add `absent()` alert for one core metric (covers data disappearing while exporter still responds — e.g., API auth expired, upstream schema changed). Pattern: `absent(core_metric_name{job="job-name"})`, 5m threshold, warning severity, **`noDataState: OK`** (not Alerting — see RB-002). **Add it to `nas/docker/grafana/provisioning/alerting/alerts.yml`**, SCP to NAS, and restart Grafana.
- [ ] Create Grafana dashboard (if service has data worth visualizing) — add JSON to `nas/docker/grafana/provisioning/dashboards/`, SCP to NAS, restart Grafana
- [ ] Add Homepage widget (customapi for live stats, iframe for Grafana time series)
- [ ] Tell user which Uptime Kuma entry to add (URL, type, keyword)

**Documentation:**
- [ ] `infrastructure/services.md` — add to machine table
- [ ] Machine README — FULL entry: services table, directory structure, env vars, directory mapping
- [ ] `decisions/ADR-XXX` + `decisions/README.md` — if non-obvious decisions were made
- [ ] `.env.example` — if new secrets were added
- [ ] `next-steps.md` — mark items complete
- [ ] `completed.md` — add summary

## Common Mistakes to Avoid

1. **Forgetting ADRs** - If you made a technical decision that wasn't obvious, document it
2. **Forgetting to update the ADR index** - `decisions/README.md` must list all ADRs
3. **Not syncing task files** - Update all three: next-steps, plans/*.md, completed
4. **Not updating .env.example** - If you added secrets, add placeholders to the template
5. **Leaving implementation plans incomplete** - Mark all phases as done
6. **Skipping Homepage/Uptime Kuma** - Every user-facing service needs a Homepage widget and Uptime Kuma monitor
7. **Not collecting prerequisites first** - If a plan requires user-provided credentials or manual steps, do those BEFORE writing code
