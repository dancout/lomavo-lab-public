---
name: branch
description: Feature branch lifecycle — create, merge, or cleanup
auto_invoke: false
arguments: "Action: create <name>, merge [name], or cleanup [name]"
---

# /branch — Feature Branch Lifecycle

Manage feature branches following the CONTRIBUTING.md workflow.

## Actions

### create <name>

Create a new feature branch from up-to-date main:

1. Ensure working tree is clean (`git status`)
2. `git checkout main && git pull`
3. `git checkout -b feature/<name>`
4. Report: branch created, ready for work

### merge [name]

Merge current (or named) feature branch into main. Runs the full CONTRIBUTING.md pre-merge checklist first.

1. Identify the branch to merge (current branch if no name given)
2. Show what will be merged:

```
${{ git log main..HEAD --oneline }}
```

3. **Run pre-merge checklist** (from CONTRIBUTING.md §3):
   - [ ] Task tracking synced (next-steps, future-plans, completed)
   - [ ] ADR created if significant decisions were made
   - [ ] `decisions/README.md` updated if ADR added
   - [ ] `.env.example` updated if new secrets added
   - [ ] `infrastructure/services.md` updated if services changed
   - [ ] Machine README updated if setup/config changed
   - [ ] Homepage widget added (if applicable)
   - [ ] Uptime Kuma entry communicated (if applicable)

4. Report any checklist gaps and ask whether to fix or proceed
5. If approved:
   ```
   git checkout main
   git pull
   git merge feature/<name> --no-ff -m "Merge feature/<name>

   <summary of changes>"
   ```
6. Do NOT push unless explicitly asked

### cleanup [name]

Delete a merged feature branch:

1. Verify branch is fully merged into main
2. `git branch -d feature/<name>`
3. Ask before deleting remote: `git push origin --delete feature/<name>`
