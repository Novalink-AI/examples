# Novalink examples

Runnable examples that call [Novalink](https://novalink.live) workflows from your own code, through the public Workflow API.

| Folder | What it shows |
|---|---|
| [`typescript/`](typescript) | A small typed client for Node 20.6+: run a workflow and wait, or stream it |
| [`python/`](python) | The same with `httpx` |
| [`curl/`](curl) | Run, poll and stream from the shell |

## Before you start

1. **Publish a workflow** in Novalink. The API always runs the published, active version.
2. **Create an API key** under **API keys**. Limit it to the workflows it needs.
3. In the folder you want to try, copy `.env.example` to `.env` and fill in `NOVALINK_API_KEY` and `NOVALINK_WORKFLOW_ID`. `.env` is git-ignored; keep keys out of source control.

## Run them

```sh
# TypeScript
cd typescript && npm install
npm run run-workflow -- "Summarise this ticket"
npm run stream-workflow -- '{"name": "Ada"}'

# Python
cd python
uv run --env-file .env run_workflow.py "Summarise this ticket"
uv run --env-file .env stream_workflow.py '{"name": "Ada"}'

# curl (needs jq)
cd curl
./run.sh "Summarise this ticket"
./poll.sh "Summarise this ticket"
./stream.sh '{"name": "Ada"}'
```

The input is sent as JSON when it parses as JSON. Anything else is sent as text, which workflows receive as `{"message": "..."}`.

## How the API answers

`POST /v1/workflows/{id}/runs` with `Authorization: Bearer $NOVALINK_API_KEY`:

- **`200`**: the run finished within `timeout` seconds (at most 60). Read `output`, or `error` when `status` is `failed`.
- **`202`**: it is still running. Poll `status_url` until `status` is `succeeded`, `failed` or `cancelled`.
- **`stream: true`**: Server-Sent Events.
  - `run.started` comes first.
  - Then `node.started`, `node.succeeded`, `node.failed` and `token` (model output as it is written).
  - Last is `run.completed`, carrying the same fields as a finished run.
  - Lines starting with `:` are heartbeats.

The full reference is at [novalink.live/docs/workflow-api](https://novalink.live/docs/workflow-api).

## Building with a coding agent

The [Novalink MCP server](https://github.com/Novalink-AI/mcp) lets Claude Code, Cursor, Antigravity or VS Code plan and build workflows, then write this kind of integration into your codebase:

```sh
npx @novalinkai/mcp install
```

## License

MIT
