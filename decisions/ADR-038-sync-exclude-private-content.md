# ADR-038: .sync-exclude for Private-Only Content in Public Repo Sync

**Status:** Accepted
**Date:** 2026-02-22

## Context

The lomavo-lab private repo is periodically synced to lomavo-lab-public via `sync-to-public.sh`, which copies all git-tracked files. Some content — such as planning docs for hardened container experiments containing security architecture details, network topology decisions, and deployment strategies — must remain private even though it should be version-controlled in the private repo.

Existing mechanisms don't cover this:
- `.gitignore` would prevent version control entirely (undesirable — we want git history in the private repo)
- A separate repository adds management overhead for what's currently just planning docs
- Manual "remember to skip these files" is error-prone

## Decision

Add a `.sync-exclude` file that lists path prefixes to filter out during the public sync. The sync script reads this file after `git ls-files` and removes matching paths before the rsync step.

### How It Works
1. `.sync-exclude` contains path prefixes, one per line (comments and blank lines ignored)
2. `sync-to-public.sh` filters the tracked file list against these prefixes
3. Excluded files are never copied to the public repo
4. The stale file cleanup step naturally handles the reverse — if an excluded file was previously synced, it gets detected as stale and removed

### Key Properties
- `.sync-exclude` itself IS git-tracked and synced to public (transparent — the community can see what's excluded without seeing the content)
- Files remain fully version-controlled in the private repo
- The existing secret-value leak check (Step 3 in the sync script) still runs as a second layer of defense

## Alternatives Considered

| Alternative | Rejected Because |
|-------------|-----------------|
| `.gitignore` the directory | Loses version control in the private repo |
| Separate repo for private docs | Overhead for a handful of planning files; these are homelab infrastructure docs |
| Manual exclusion during sync | Error-prone, no audit trail, depends on memory |
| Conditional `.gitignore` per-repo | Git doesn't support this natively |

## Consequences

**Positive:**
- Private content stays version-controlled in the private repo
- Exclusion is explicit, auditable, and version-controlled
- Transparent to the public (they can see what's excluded)
- Extensible — adding future private-only paths is one line

**Negative:**
- Adds complexity to the sync script (filtering step)
- Relies on the sync script being used — manual file copies could bypass it
- No automated guardrail yet to catch leaks if exclusion fails (planned: public repo scan skill)

## Follow-Up
- A dedicated guardrail skill to scan the public repo for private project references before commits is planned but not yet implemented. This will provide defense-in-depth beyond the `.sync-exclude` filtering.

## Related
- ADR-018: Sensitive Data Placeholders for Public Sharing (established the private/public separation pattern)
- ADR-002: Environment Variables for Docker Secrets (secrets in .env, not in git)
