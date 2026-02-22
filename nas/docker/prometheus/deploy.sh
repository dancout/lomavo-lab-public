#!/usr/bin/env bash
set -euo pipefail

# Deploy prometheus.yml to NAS with variable substitution.
# Resolves ${VAR} placeholders in the template, SCPs the result to NAS,
# and restarts the Prometheus container.
#
# Deployment node: Runs on any Unix system (MacBook, Linux, WSL, container, etc.)
# that has envsubst and SSH/SCP access to NAS.
#
# Requirements:
#   - envsubst (GNU gettext)
#   - SSH/SCP access to NAS
#   - .env.local with RPI_IP, GAMING_PC_IP, NAS_IP, NAS_USER, QDRANT_API_KEY
#
# Usage: ./nas/docker/prometheus/deploy.sh   (run from repo root)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
TEMPLATE="$SCRIPT_DIR/prometheus.yml"
ENV_FILE="$REPO_ROOT/.env.local"
REMOTE_DIR="/share/CACHEDEV1_DATA/docker/prometheus"

# --- Check for required tools ---
if ! command -v envsubst &> /dev/null; then
  echo "ERROR: envsubst is required but not found in \$PATH"
  echo ""
  echo "envsubst is part of GNU gettext. Install it:"
  echo "  macOS (Homebrew):  brew install gettext"
  echo "  Ubuntu/Debian:     sudo apt-get install gettext"
  echo "  Fedora/RHEL:       sudo dnf install gettext"
  echo ""
  echo "After installation, ensure it's in your PATH:"
  echo "  which envsubst"
  exit 1
fi

# Temp file with cleanup trap
RESOLVED=$(mktemp)
trap 'rm -f "$RESOLVED"' EXIT

# --- Load variables from .env.local ---
# Uses grep+eval to extract only needed vars (avoids sourcing issues with
# unquoted spaces in other variables like GAMING_PC_USER).
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. Copy .env.local.example to .env.local and fill in values."
  exit 1
fi

for var in RPI_IP GAMING_PC_IP NAS_IP NAS_USER QDRANT_API_KEY; do
  line=$(grep "^${var}=" "$ENV_FILE" || true)
  if [[ -z "$line" ]]; then
    echo "ERROR: $var not found in $ENV_FILE"
    exit 1
  fi
  eval "export $line"
done

# --- Validate all required variables are set ---
MISSING=()
for var in RPI_IP GAMING_PC_IP NAS_IP NAS_USER QDRANT_API_KEY; do
  if [[ -z "${!var:-}" ]]; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -gt 0 ]]; then
  echo "ERROR: Missing values for: ${MISSING[*]}"
  echo "Set them in $ENV_FILE"
  exit 1
fi

# --- Substitute variables ---
# Explicit variable list ensures only these 4 are replaced (not stray shell vars).
envsubst '${RPI_IP} ${GAMING_PC_IP} ${NAS_IP} ${QDRANT_API_KEY}' < "$TEMPLATE" > "$RESOLVED"

# --- Verify no unresolved variables remain ---
if grep -qE '\$\{[A-Z_]+\}' "$RESOLVED"; then
  echo "ERROR: Unresolved variables in output:"
  grep -E '\$\{[A-Z_]+\}' "$RESOLVED"
  exit 1
fi

# --- Deploy ---
MASKED_KEY="${QDRANT_API_KEY:0:4}****"
echo "Deploying prometheus.yml to ${NAS_USER}@${NAS_IP}:${REMOTE_DIR}/"
echo "  RPI_IP=${RPI_IP}  GAMING_PC_IP=${GAMING_PC_IP}  NAS_IP=${NAS_IP}"
echo "  QDRANT_API_KEY=${MASKED_KEY}"

scp "$RESOLVED" "${NAS_USER}@${NAS_IP}:${REMOTE_DIR}/prometheus.yml"

echo "Restarting Prometheus container..."
ssh "${NAS_USER}@${NAS_IP}" "cd ${REMOTE_DIR} && export PATH=/share/CACHEDEV1_DATA/.qpkg/container-station/bin:\$PATH && DOCKER_HOST=unix:///var/run/system-docker.sock docker compose restart prometheus"

echo "Done. Verify targets at http://${NAS_IP}:9090/targets"
