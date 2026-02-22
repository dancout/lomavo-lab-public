#!/usr/bin/env bash
set -euo pipefail

# Sync git-tracked files from private lomavo-lab to public lomavo-lab-public.
# Only copies files that git tracks (automatically excludes .env, .mcp.json, etc.)
# Validates no sensitive values leak, commits in public repo, but does NOT push.

PRIVATE_DIR="$(cd "$(dirname "$0")" && pwd)"
PUBLIC_DIR="${PRIVATE_DIR}/../lomavo-lab-public"

# --- Preflight checks ---

if [[ ! -d "$PUBLIC_DIR/.git" ]]; then
    echo "ERROR: Public repo not found at $PUBLIC_DIR"
    echo "Clone it first: git clone <url> ../lomavo-lab-public"
    exit 1
fi

if [[ ! -f "$PRIVATE_DIR/.env" ]]; then
    echo "ERROR: .env not found — cannot run leak validation"
    exit 1
fi

# --- Step 1: Export git-tracked files ---

echo "==> Syncing git-tracked files to public repo..."

TRACKED_FILES=$(mktemp)
trap 'rm -f "$TRACKED_FILES"' EXIT

cd "$PRIVATE_DIR"
git ls-files > "$TRACKED_FILES"

rsync -a --files-from="$TRACKED_FILES" "$PRIVATE_DIR/" "$PUBLIC_DIR/"

echo "    Copied $(wc -l < "$TRACKED_FILES" | tr -d ' ') tracked files."

# --- Step 2: Delete files in public that are no longer tracked in private ---

echo "==> Checking for stale files in public repo..."

DELETED=0
cd "$PUBLIC_DIR"
while IFS= read -r public_file; do
    # Skip .git directory
    [[ "$public_file" == .git/* ]] && continue
    # If file exists in public but is not in the tracked list, remove it
    if ! grep -qxF "$public_file" "$TRACKED_FILES"; then
        echo "    Removing stale file: $public_file"
        rm "$PUBLIC_DIR/$public_file"
        DELETED=$((DELETED + 1))
    fi
done < <(git ls-files)

if [[ $DELETED -gt 0 ]]; then
    echo "    Removed $DELETED stale file(s)."
else
    echo "    No stale files found."
fi

# --- Step 3: Validate no sensitive values leaked ---

echo "==> Validating no secrets leaked into public repo..."

# Keys whose values are sensitive (skip port numbers — those are fine to leak)
SENSITIVE_KEYS=(
    RPI_IP GAMING_PC_IP NAS_IP MACBOOK_IP ROUTER_IP VIP
    RPI_USER GAMING_PC_USER NAS_USER GITHUB_USER
    DOMAIN STATUS_URL PHOTOS_URL HOMEPAGE_ALLOWED_HOSTS
    UPTIME_KUMA_PUSH_TOKEN CLOUDFLARE_API_TOKEN QDRANT_API_KEY
    REPO_PATH SSH_KEY_DIR
)

LEAK_FOUND=0
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ -z "$key" || "$key" == \#* ]] && continue
    # Strip leading/trailing whitespace from value
    value=$(echo "$value" | xargs)
    # Skip empty values
    [[ -z "$value" ]] && continue
    # Only check sensitive keys
    is_sensitive=false
    for sk in "${SENSITIVE_KEYS[@]}"; do
        if [[ "$key" == "$sk" ]]; then
            is_sensitive=true
            break
        fi
    done
    $is_sensitive || continue
    # Skip very short values (3 chars or less) — too many false positives
    [[ ${#value} -le 3 ]] && continue
    # Skip values that are also common software/tool names (causes false positives)
    # e.g., RPI_USER=pi-hole matches every mention of "Pi-hole" the software
    case "$value" in
        pi-hole|pihole) continue ;;
    esac
    # Grep public repo for this value
    # Use word-boundary regex for IPs (avoids short IPs matching inside longer ones)
    # Use fixed-string for everything else
    if [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        escaped=$(printf '%s' "$value" | sed 's/\./\\./g')
        matches=$(grep -rPl "(^|[^0-9])${escaped}([^0-9]|$)" "$PUBLIC_DIR" --include='*' \
            --exclude-dir='.git' 2>/dev/null || true)
    else
        matches=$(grep -rFl "$value" "$PUBLIC_DIR" --include='*' \
            --exclude-dir='.git' 2>/dev/null || true)
    fi
    if [[ -n "$matches" ]]; then
        echo "    LEAK DETECTED for $key in:"
        echo "$matches" | sed 's/^/      /'
        LEAK_FOUND=1
    fi
done < "$PRIVATE_DIR/.env"

if [[ $LEAK_FOUND -eq 1 ]]; then
    echo ""
    echo "ERROR: Sensitive values found in public repo! Aborting."
    echo "Fix the source files, then re-run this script."
    exit 1
fi

echo "    No leaks detected."

# --- Step 4: Commit in public repo ---

echo "==> Committing changes in public repo..."

cd "$PUBLIC_DIR"
git add -A

if git diff --cached --quiet; then
    echo "    No changes to commit."
else
    COMMIT_MSG="Sync from private repo ($(date +%Y-%m-%d))"
    git commit -m "$COMMIT_MSG"
    echo "    Committed: $COMMIT_MSG"
fi

# --- Done ---

echo ""
echo "Done! Review the changes, then push when ready:"
echo "  cd $PUBLIC_DIR && git push"
