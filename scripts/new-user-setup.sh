#!/usr/bin/env bash
set -euo pipefail

# new-user-setup.sh — One-time setup to make lomavo-lab yours.
# Archives the original owner's completed.md and next-steps.md, creates your clean slate.
# See GETTING_STARTED.md for full onboarding instructions.

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ARCHIVE_DIR="$REPO_ROOT/archive"

DISCLAIMER='# -----------------------------------------------------------------------
# ARCHIVED REFERENCE — Not your current state
# This is the original lomavo-lab owner'\''s build log. It documents what
# THEY built and when. It is NOT your task list or your completed work.
# Read it to learn from their experience, then work from your own
# completed.md and next-steps.md.
# -----------------------------------------------------------------------

'

echo "=== lomavo-lab New User Setup ==="
echo ""
echo "This script sets up lomavo-lab for YOUR homelab. It will:"
echo "  1. Archive the original owner's completed.md and next-steps.md"
echo "  2. Create fresh completed.md and next-steps.md for you"
echo "  3. Copy .env.example -> .env (if not already present)"
echo "  4. Copy HOMELAB_PROFILE.md.example -> HOMELAB_PROFILE.md (if not already present)"
echo ""

# Check if already initialized
if [ -f "$ARCHIVE_DIR/completed-example.md" ] || [ -f "$ARCHIVE_DIR/next-steps-example.md" ]; then
    echo "It looks like this repo has already been initialized (archive/ has content)."
    echo "If you want to re-run, delete the archive/ directory first."
    exit 1
fi

read -rp "Continue? [y/N] " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 0
fi

echo ""

# --- Step 1: Archive original files ---

mkdir -p "$ARCHIVE_DIR"

echo "Archiving completed.md -> archive/completed-example.md..."
printf '%s' "$DISCLAIMER" > "$ARCHIVE_DIR/completed-example.md"
cat "$REPO_ROOT/completed.md" >> "$ARCHIVE_DIR/completed-example.md"

echo "Archiving next-steps.md -> archive/next-steps-example.md..."
printf '%s' "$DISCLAIMER" > "$ARCHIVE_DIR/next-steps-example.md"
cat "$REPO_ROOT/next-steps.md" >> "$ARCHIVE_DIR/next-steps-example.md"

# --- Step 2: Create fresh files ---

CURRENT_MONTH=$(date +"%B %Y")

echo "Creating fresh completed.md..."
cat > "$REPO_ROOT/completed.md" << EOF
# Completed Work

Archive of completed milestones. See \`plans/README.md\` for future roadmap, git log for full history.

## $CURRENT_MONTH

_Your completed work goes here._
EOF

echo "Creating fresh next-steps.md..."
cat > "$REPO_ROOT/next-steps.md" << 'EOF'
# Next Steps

See `plans/README.md` for detailed topic files, `completed.md` for history.

## Current Sprint

_Pick a task from below and move it here with `/next-task`._

## Priority 1 — Quick Wins

~1 session each, no blockers.

- [ ] Set up SSH key authentication to all machines (see GETTING_STARTED.md)
- [ ] Fill in .env with your IPs, usernames, and tokens
- [ ] Deploy first service and verify connectivity

## Priority 2 — Medium Effort, High Payoff

~1-3 sessions each.

- [ ] _Add your tasks here_

## Priority 3 — Larger Features

Multi-session, may need decisions.

- [ ] _Add your tasks here_

## Priority 4 — Deferred / Hardware-Dependent

Blocked on hardware or major infrastructure changes.

- [ ] _Add your tasks here_

## Learning Projects

Educational value, not operationally needed.

- [ ] _Add your tasks here_
EOF

# --- Step 3: Copy templates ---

if [ -f "$REPO_ROOT/.env" ]; then
    echo "Skipping .env — already exists."
else
    echo "Copying .env.example -> .env..."
    cp "$REPO_ROOT/.env.example" "$REPO_ROOT/.env"
fi

if [ -f "$REPO_ROOT/HOMELAB_PROFILE.md" ]; then
    echo "Skipping HOMELAB_PROFILE.md — already exists."
else
    echo "Copying HOMELAB_PROFILE.md.example -> HOMELAB_PROFILE.md..."
    cp "$REPO_ROOT/HOMELAB_PROFILE.md.example" "$REPO_ROOT/HOMELAB_PROFILE.md"
fi

# --- Done ---

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Edit HOMELAB_PROFILE.md — describe your hardware, experience, and goals"
echo "  2. Edit .env — fill in your IPs, usernames, and tokens"
echo "  3. Set up SSH keys to your machines (see GETTING_STARTED.md)"
echo "  4. Add your first tasks to next-steps.md"
echo "  5. Read CLAUDE.md to understand how AI agents work with this repo"
echo ""
echo "The original owner's build log is in archive/ — useful reference, not your state."
