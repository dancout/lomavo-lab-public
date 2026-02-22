# Getting Started

## What This Repo Is

lomavo-lab is a fully operational homelab documentation repo that doubles as a reusable framework. The structure, scripts, ADRs, and Docker configs are generic enough to adapt to your hardware. The owner's specific choices are documented throughout so you understand the reasoning — not so you have to replicate them exactly.

Everything is parameterized via `.env` — no hardcoded IPs, usernames, or domains in tracked files.

## Quick Start (for forkers)

1. **Fill in `HOMELAB_PROFILE.md`** — your hardware, experience, goals
2. **Run `scripts/new-user-setup.sh`** — archives the original owner's state, creates your clean slate
3. **Fill in `.env`** — your IPs, usernames, tokens (copied from `.env.example` by the script)
4. **Start with `next-steps.md`** — add your own tasks
5. **Read `CONTRIBUTING.md`** — feature branches, deployment checklists, ADR creation. All of this applies to your fork too.

## What You Get Out of the Box

No setup needed — it's all in the repo:

- **CONTRIBUTING.md** — commit workflow, new service deployment checklist, merge checklist
- **CLAUDE.md** — AI agent instructions (works for your homelab once you fill in `.env`)
- **36 ADRs** — documented decisions with reasoning, all adaptable to your setup
- **Machine READMEs** — deployment guides for Pi, Gaming PC, NAS
- **Docker Compose files** — fully parameterized via `.env`
- **All scripts** — keepalived health checks, deploy scripts, sync scripts
- **Runbooks** — incident response procedures with diagnosis steps and fixes
- **Plans** — phased roadmap with topic files you can adapt to your goals

## What's in `archive/`

After running the setup script, `archive/` contains:

- **`completed-example.md`** — the original owner's build log
- **`next-steps-example.md`** — the original owner's task queue

These are valuable for understanding HOW services were deployed, what bugs were hit, and the sequence of decisions. They are **not** your current state — your AI agent reads your `completed.md` and `next-steps.md`, not these.

## SSH Prerequisites

Before running any deploy commands, set up SSH key authentication to your machines:

```bash
# Generate an SSH key (if you don't have one)
ssh-keygen -t ed25519

# Copy your key to each machine
ssh-copy-id user@raspberry-pi-ip
ssh-copy-id user@gaming-pc-ip
ssh-copy-id user@nas-ip

# Test connectivity
ssh user@raspberry-pi-ip "hostname"
ssh user@gaming-pc-ip "hostname"
ssh user@nas-ip "hostname"
```

Your machine IPs and usernames will differ from what `.env.example` shows — that file is a template, not a prescription.

## Key Files (reading order)

1. **`HOMELAB_PROFILE.md`** — your hardware and goals context (fill this in first)
2. **`CLAUDE.md`** — AI agent instructions for this repo
3. **`infrastructure/services.md`** — full service inventory
4. **`decisions/README.md`** — 36 ADRs explaining non-obvious choices
5. **`plans/README.md`** — phased roadmap topic files
6. **`CONTRIBUTING.md`** — development workflow and checklists
