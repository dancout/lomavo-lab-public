# Writing Instructions Guide

Rules for maintaining CLAUDE.md, auto-memory, and reference documentation. Read this before updating any instruction file.

## File Purposes

| File | Purpose | Loaded When | Budget |
|------|---------|-------------|--------|
| `CLAUDE.md` | Behavioral routing — what to do, where to look | Every conversation | ~120 lines |
| Auto-memory `MEMORY.md` | Index + critical behavioral rules | Every conversation | 200 lines (hard limit) |
| Auto-memory topic files | Detailed operational knowledge by topic | On demand (searched) | No limit, but stay focused |
| `reference/operational-knowledge/` | Version-controlled, secret-free knowledge | On demand (read when needed) | No limit |
| `reference/design-principles.md` | Homelab pillars and technical principles | When making design decisions | No limit |

## CLAUDE.md Rules

**Only include content that applies to EVERY conversation.** If a section is only needed for specific tasks, move it to a reference file and add a routing entry to "What to Read When."

- Behavioral directives: what to do, what NOT to do, what to ask first
- Routing table: "when you need X, read Y"
- SSH access table and permissions (needed every session)
- Documentation update rules (needed every session)
- Before-merging checklist (needed every session)

**Do NOT include:**
- Deploy command examples (move to `reference/deploy-commands.md`)
- File tree diagrams (move to `reference/file-organization.md`)
- Credential lookup tables (move to `reference/credentials.md`)
- Port listings (already in `infrastructure/services.md`)

## MEMORY.md Rules

**Section A (inline, ~30 lines):** CRITICAL and ACTION behavioral rules only — things that prevent mistakes if forgotten. These load every conversation.

**Section B (index table, ~20 lines):** Pointers to topic files with one-line descriptions. Format:

```
| Topic File | Contents |
|---|---|
| `qnap.md` | Docker paths, sysctl, build workarounds, permissions |
```

**What qualifies as inline (Section A):**
- Marked CRITICAL — ignoring it causes real damage (data loss, security exposure)
- Marked ACTION — changes default behavior ("don't do X, do Y instead")
- Needed in >50% of conversations

**Everything else goes in a topic file.**

## Memory Topic File Rules

- **One topic per file** — don't mix QNAP knowledge with Grafana knowledge
- **Problem/solution/lesson format** — state what went wrong, what fixed it, what to remember
- **Include dates** for time-sensitive facts (versions, workarounds that may expire)
- **No secrets** — no real IPs, passwords, API keys, or tokens in topic files
- **Link to ADRs** where relevant — "See ADR-031 for full details"
- **Prune aggressively** — if a workaround is no longer needed, delete it

## Version-Controlled Knowledge Rules (`reference/operational-knowledge/`)

These files are committed to the public repo. Security review before committing:

- **No real IPs** — use `<RPI_IP>`, `<NAS_IP>`, etc.
- **No passwords or API keys** — use `<PASSWORD>`, `<API_KEY>`
- **No real usernames** — use `<RPI_USER>`, `<NAS_USER>`
- **No domain names** — use `<DOMAIN>`
- **Grep check:** `grep -rE '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}' reference/operational-knowledge/` should return 0

Auto-memory topic files can contain real values (they're gitignored). Reference the version-controlled file for the portable knowledge, keep local specifics in auto-memory.

## Writing Style

- **Imperative voice** — "Use X" not "You should use X" or "We use X"
- **Bullets over paragraphs** — scannable, not prose
- **Include the "why"** — "Use `up -d` not `restart` — restart doesn't re-read .env files"
- **Mark urgency levels:**
  - **CRITICAL** — ignoring causes damage (data loss, security, broken deployments)
  - **ACTION** — changes default behavior (do this instead of the obvious thing)
  - **LESSON** — learned the hard way, prevent repeating
- **Be specific** — include exact commands, error messages, config keys
- **Date time-sensitive facts** — "(2026-02)" for workarounds that may expire

## When to Update What

| Situation | Update |
|-----------|--------|
| New behavioral rule (applies every session) | CLAUDE.md |
| New operational gotcha or workaround | Auto-memory topic file + optionally `reference/operational-knowledge/` |
| New routing need ("where do I find X?") | CLAUDE.md "What to Read When" table |
| Architectural decision | ADR + `decisions/README.md` |
| New service or config change | `infrastructure/services.md` + machine README |
| Credentials or deploy commands changed | `reference/credentials.md` or `reference/deploy-commands.md` |
| Memory topic file exceeds usefulness | Prune, consolidate, or split |
