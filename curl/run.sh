#!/usr/bin/env bash
# Runs a published workflow and prints the result. Usage: ./run.sh "some text" or ./run.sh '{"name": "Ada"}'
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source=/dev/null  # .env is local and optional
[ -f .env ] && set -a && . ./.env && set +a
: "${WORFILO_API_KEY:?Set WORFILO_API_KEY in .env}" "${WORFILO_WORKFLOW_ID:?Set WORFILO_WORKFLOW_ID in .env}"
API="${WORFILO_API_URL:-https://api.worfilo.com}"

input="${1:-Hello from the Worfilo examples}"
# JSON input goes as is; anything else is sent as text, which workflows receive as {"message": text}
if ! printf '%s' "$input" | jq -e . >/dev/null 2>&1; then input=$(jq -Rn --arg text "$input" '$text'); fi

# 200 means finished; 202 means still running, so poll the status_url it returns (see poll.sh)
curl -sS "$API/v1/workflows/$WORFILO_WORKFLOW_ID/runs" \
  -H "Authorization: Bearer $WORFILO_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"input\": $input, \"wait\": true, \"timeout\": 30}" | jq .
