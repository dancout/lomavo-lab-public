---
name: next-task
description: "Pick the next task from the backlog and execute it"
auto_invoke: When the user says "next task", "pick a task", or "what should I work on"
arguments: Optional specific task description to target
---

# /next-task — Autonomous Task Execution

Read the backlog, pick the highest priority task, plan it, and execute after approval.

## Steps

### 1. Load Current State

```
${{ cat next-steps.md }}
```

```
${{ cat plans/README.md }}
```

### 2. Select a Task

- If an argument was provided, find the matching task
- Otherwise, scan `next-steps.md` **top-down by section** and pick the first unchecked item:
  1. `## Current sprint / immediate tasks` — always first
  2. `## Next up` — only if Current sprint is empty
  3. `## Backlog` — only if both above are empty (respect subsection order: higher subsections first)
- If ALL sections in `next-steps.md` are empty, pull from `plans/README.md` and the relevant topic file
- Announce the selected task **and which section it came from**

### 3. Research & Plan (MUST use plan mode)

Call `EnterPlanMode` to enter plan mode. Then:

- Read relevant files for context (machine READMEs, ADRs, service docs)
- Check runbooks (`runbooks/README.md`) for related past incidents
- Follow research guidelines: self-hosted docs first, check deployed versions
- Use agents for scoped investigation:
  - `researcher` for exploratory investigation
  - `monitor` for health/diagnostic checks

Write findings and implementation plan to the plan file. Include:
- What will be done (specific files, commands, configs)
- Prerequisites requiring user action (Gaming PC console commands, security changes)
- Expected documentation updates

The plan file survives context clearing. Invest tokens in context upfront — a new session reading the plan should understand the full picture without re-reading other files.

Call `ExitPlanMode` when the plan is ready for approval.

### 4. Create Feature Branch

Use `/branch create <task-name>` to create a feature branch before any work begins. The branch name should be a short kebab-case summary of the task (e.g., `feature/mcp-document-search-defaults`).

If already on a feature branch (e.g., continuing previous work), skip this step and note the current branch.

### 5. Get Approval

Wait for user approval before proceeding. Flag:
- **Gaming PC console commands** — user must run these locally (Docker credential store issue)
- **Security changes** — firewall rules, SSH config, port exposure need explicit approval
- **Prerequisites** — credentials, API keys, or manual setup the user must complete first

### 6. Execute

Implement the task. Use the `deployer` agent for deployment steps.

**For multi-phase tasks:** After completing each distinct phase or logical unit of work:
1. Run `/doc-update <description of what just changed>` to sync documentation while details are fresh
2. Run `/commit` to checkpoint progress

Do NOT defer all documentation to the final step — write docs when the context is richest. Context compaction loses granular details that are critical for accurate documentation.

### 7. Security Review

Run `/security-review` to check for security issues in the changes made during this task. Address any HIGH or MEDIUM findings before proceeding — fix the code, then re-run `/security-review` to confirm resolution.

Run `/secrets-check` to verify no secrets were introduced or exposed in the changes.

Skip this step only for pure documentation or task-tracking changes with no config, script, or infrastructure modifications.

### 8. Final Documentation & Task File Sync

Run `/doc-update` to sync all documentation layers at once. This command handles:
- [ ] `next-steps.md` — removes completed item (not just checking it off)
- [ ] Relevant `plans/*.md` topic file — checks off completed items
- [ ] `completed.md` — adds summary entry with date
- [ ] ADR index if new decisions were documented
- [ ] Any other affected documentation

**IMPORTANT:** Actually invoke `/doc-update` rather than just noting what should happen. In practice, it's easy to skip this step and defer documentation sync, but calling `/doc-update` ensures all layers update consistently in one operation.

- [ ] ADR created if non-obvious decisions were made
- [ ] All affected documentation layers updated (see `/doc-update` checklist)

Finally, run `/commit` for the final documentation commit and announce the task is complete.
