#!/usr/bin/env bash
# Streams a run as Server-Sent Events: steps, model tokens, then run.completed. Usage: ./stream.sh "some text"
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source=/dev/null  # .env is local and optional
[ -f .env ] && set -a && . ./.env && set +a
: "${WORFILO_API_KEY:?Set WORFILO_API_KEY in .env}" "${WORFILO_WORKFLOW_ID:?Set WORFILO_WORKFLOW_ID in .env}"
API="${WORFILO_API_URL:-https://api.worfilo.com}"

input="${1:-Hello from the Worfilo examples}"
if ! printf '%s' "$input" | jq -e . >/dev/null 2>&1; then input=$(jq -Rn --arg text "$input" '$text'); fi

curl -sSN "$API/v1/workflows/$WORFILO_WORKFLOW_ID/runs" \
  -H "Authorization: Bearer $WORFILO_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"input\": $input, \"stream\": true}"
