#!/usr/bin/env bash
set -euo pipefail

# Check git-tracked files in this repo for hardcoded sensitive values from .env.
# Exit code 0 = clean, 1 = leaks found, 2 = setup error.
# Use --verbose for per-file line details, otherwise shows file names only.

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
VERBOSE=false
[[ "${1:-}" == "--verbose" ]] && VERBOSE=true

if [[ ! -f "$REPO_DIR/.env" ]]; then
    echo "ERROR: .env not found — cannot run leak check"
    exit 2
fi

cd "$REPO_DIR"

# Keys whose values are sensitive (ports are fine to expose)
SENSITIVE_KEYS=(
    RPI_IP GAMING_PC_IP NAS_IP MACBOOK_IP ROUTER_IP VIP
    RPI_USER GAMING_PC_USER NAS_USER GITHUB_USER
    DOMAIN STATUS_URL PHOTOS_URL HOMEPAGE_ALLOWED_HOSTS
    UPTIME_KUMA_PUSH_TOKEN CLOUDFLARE_API_TOKEN QDRANT_API_KEY
    REPO_PATH SSH_KEY_DIR
)

# Values that are also common software/tool names — skip to avoid false positives
SKIP_VALUES=(pi-hole pihole)

LEAK_COUNT=0
LEAK_KEYS=()

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
        [[ "$key" == "$sk" ]] && { is_sensitive=true; break; }
    done
    $is_sensitive || continue
    # Skip very short values (3 chars or less)
    [[ ${#value} -le 3 ]] && continue
    # Skip software name false positives
    for sv in "${SKIP_VALUES[@]}"; do
        [[ "$value" == "$sv" ]] && continue 2
    done

    # Use git grep to search only tracked files (fast, excludes .env since it's untracked)
    # Word-boundary matching for IPs to avoid short IPs matching inside longer ones
    if [[ "$value" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        escaped=$(printf '%s' "$value" | sed 's/\./\\./g')
        matches=$(git grep -Pn "(^|[^0-9])${escaped}([^0-9]|$)" -- . 2>/dev/null || true)
    else
        matches=$(git grep -Fn "$value" -- . 2>/dev/null || true)
    fi

    if [[ -n "$matches" ]]; then
        match_count=$(echo "$matches" | wc -l | tr -d ' ')
        file_count=$(echo "$matches" | cut -d: -f1 | sort -u | wc -l | tr -d ' ')
        LEAK_COUNT=$((LEAK_COUNT + match_count))
        LEAK_KEYS+=("$key")
        echo "EXPOSED: $key ($match_count occurrences in $file_count files)"
        if $VERBOSE; then
            echo "$matches" | sed 's/^/  /'
        else
            echo "$matches" | cut -d: -f1 | sort -u | sed 's/^/  /'
        fi
        echo
    fi
done < "$REPO_DIR/.env"

echo "---"
if [[ $LEAK_COUNT -eq 0 ]]; then
    echo "CLEAN: No sensitive values found in tracked files."
    exit 0
else
    unique_keys=$(printf '%s\n' "${LEAK_KEYS[@]}" | sort -u | wc -l | tr -d ' ')
    echo "FOUND: $LEAK_COUNT occurrences across $unique_keys sensitive keys."
    echo "Keys exposed: ${LEAK_KEYS[*]}"
    echo ""
    echo "To see exact lines: ./check-secrets.sh --verbose"
    exit 1
fi
