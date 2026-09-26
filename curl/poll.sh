#!/usr/bin/env bash
# Starts a run without waiting, then polls until it finishes. Usage: ./poll.sh "some text"
set -euo pipefail
cd "$(dirname "$0")"
# shellcheck source=/dev/null  # .env is local and optional
[ -f .env ] && set -a && . ./.env && set +a
: "${NOVALINK_API_KEY:?Set NOVALINK_API_KEY in .env}" "${NOVALINK_WORKFLOW_ID:?Set NOVALINK_WORKFLOW_ID in .env}"
API="${NOVALINK_API_URL:-https://api.novalink.live}"
AUTH="Authorization: Bearer $NOVALINK_API_KEY"

input="${1:-Hello from the Novalink examples}"
if ! printf '%s' "$input" | jq -e . >/dev/null 2>&1; then input=$(jq -Rn --arg text "$input" '$text'); fi

run=$(curl -sS "$API/v1/workflows/$NOVALINK_WORKFLOW_ID/runs" -H "$AUTH" -H "Content-Type: application/json" \
  -d "{\"input\": $input, \"wait\": false}")
status_url=$(jq -r .status_url <<<"$run")

while [ "$(jq -r .status <<<"$run")" = "queued" ] || [ "$(jq -r .status <<<"$run")" = "running" ]; do
  echo "$(jq -r .status <<<"$run")..." >&2
  sleep 1
  run=$(curl -sS "$status_url" -H "$AUTH")
done
jq . <<<"$run"
