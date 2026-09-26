#!/usr/bin/env bash
# Streams a run as Server-Sent Events: steps, model tokens, then run.completed. Usage: ./stream.sh "some text"
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source=/dev/null  # .env is local and optional
[ -f .env ] && set -a && . ./.env && set +a
: "${NOVALINK_API_KEY:?Set NOVALINK_API_KEY in .env}" "${NOVALINK_WORKFLOW_ID:?Set NOVALINK_WORKFLOW_ID in .env}"
API="${NOVALINK_API_URL:-https://api.novalink.live}"

input="${1:-Hello from the Novalink examples}"
if ! printf '%s' "$input" | jq -e . >/dev/null 2>&1; then input=$(jq -Rn --arg text "$input" '$text'); fi

curl -sSN "$API/v1/workflows/$NOVALINK_WORKFLOW_ID/runs" \
  -H "Authorization: Bearer $NOVALINK_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"input\": $input, \"stream\": true}"
