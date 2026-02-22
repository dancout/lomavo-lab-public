#!/usr/bin/env bash
# wake-gaming-pc.sh — Send WoL magic packet to Gaming PC and wait until it responds.
# Usage: ./wake-gaming-pc.sh [timeout_seconds]
# Requires: wakeonlan (sudo apt-get install wakeonlan)
# Reads GAMING_PC_MAC and GAMING_PC_IP from environment.

set -euo pipefail

GAMING_PC_MAC="${GAMING_PC_MAC:?GAMING_PC_MAC not set — source .env or export manually}"
GAMING_PC_IP="${GAMING_PC_IP:?GAMING_PC_IP not set — source .env or export manually}"
BROADCAST="10.0.0.255"
MAX_WAIT="${1:-90}"
POLL_INTERVAL=5

echo "[$(date)] Sending magic packet to $GAMING_PC_MAC..."
wakeonlan -i "$BROADCAST" "$GAMING_PC_MAC"

echo "[$(date)] Waiting for Gaming PC ($GAMING_PC_IP) to come online (max ${MAX_WAIT}s)..."
ELAPSED=0
while [ "$ELAPSED" -lt "$MAX_WAIT" ]; do
    if ping -c 1 -W 2 "$GAMING_PC_IP" > /dev/null 2>&1; then
        echo "[$(date)] Gaming PC is online! (${ELAPSED}s)"
        exit 0
    fi
    sleep "$POLL_INTERVAL"
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
done

echo "[$(date)] Timeout: Gaming PC did not respond within ${MAX_WAIT}s"
exit 1
