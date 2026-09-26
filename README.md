# Worfilo Examples

[![CI](https://github.com/Worfilo/examples/actions/workflows/ci.yml/badge.svg)](https://github.com/Worfilo/examples/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Reference clients for calling [Worfilo](https://worfilo.com) workflows from your own applications through the Workflow API.

Every published Worfilo workflow is an HTTP endpoint. These examples show how to call one from TypeScript, Python and the shell, covering three patterns: waiting for the result, polling long-running runs, and streaming progress as it happens.

## Contents

- [Examples](#examples)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Running the examples](#running-the-examples)
- [API overview](#api-overview)
- [Error handling](#error-handling)
- [Security](#security)
- [Building with a coding agent](#building-with-a-coding-agent)
- [License](#license)

## Examples

| Directory | Language | Contents |
|---|---|---|
| [`typescript/`](typescript) | TypeScript, Node.js 20.6+ | A typed client with no runtime dependencies, plus run and stream scripts |
| [`python/`](python) | Python 3.10+ | A client built on `httpx`, plus run and stream scripts |
| [`curl/`](curl) | Bash, curl and jq | Scripts for running, polling and streaming |

Each client is small enough to copy into your own project.

## Prerequisites

1. A [Worfilo](https://worfilo.com) account with a **published** workflow. The API always runs the active published version, never the draft.
2. An **API key**, created under **API keys** in Worfilo. Restrict each key to the workflows it needs.
3. The workflow's ID, shown in the workflow's URL and on its Playground page.

## Getting started

Clone the repository and configure the example you want to use:

```sh
git clone https://github.com/Worfilo/examples.git
cd examples/typescript          # or python, or curl
cp .env.example .env
```

Set these values in `.env`:

| Variable | Required | Description |
|---|---|---|
| `WORFILO_API_KEY` | Yes | Your API key, beginning with `wfo_` |
| `WORFILO_WORKFLOW_ID` | Yes | The ID of the published workflow to run |
| `WORFILO_API_URL` | No | API base URL. Defaults to `https://api.worfilo.com` |

`.env` is excluded from version control by `.gitignore`.

## Running the examples

The input argument is sent as JSON when it parses as JSON. Any other text is sent as a string, which workflows receive as `{"message": "..."}`.

### TypeScript

```sh
cd typescript
npm install
npm run run-workflow -- "Summarize this support ticket"
npm run stream-workflow -- '{"name": "Ada"}'
```

### Python

Using [uv](https://docs.astral.sh/uv/):

```sh
cd python
uv run --env-file .env run_workflow.py "Summarize this support ticket"
uv run --env-file .env stream_workflow.py '{"name": "Ada"}'
```

Or with pip:

```sh
cd python
pip install httpx
set -a && . ./.env && set +a
python run_workflow.py "Summarize this support ticket"
```

### curl

Requires `curl` and `jq`.

```sh
cd curl
./run.sh "Summarize this support ticket"     # wait for the result
./poll.sh "Summarize this support ticket"    # start, then poll until finished
./stream.sh '{"name": "Ada"}'                # stream events as they happen
```

## API overview

Run a workflow with a single request:

```http
POST /v1/workflows/{workflow_id}/runs
Authorization: Bearer <WORFILO_API_KEY>
Content-Type: application/json

{ "input": { "message": "Hello" }, "wait": true, "timeout": 30 }
```

| Field | Type | Default | Description |
|---|---|---|---|
| `input` | object or string | `null` | The trigger payload. A string becomes `{"message": "..."}` |
| `wait` | boolean | `true` | Wait for the run to finish, up to `timeout` seconds |
| `timeout` | number | `30` | Maximum wait in seconds, up to 60 |
| `stream` | boolean | `false` | Respond with Server-Sent Events instead of a single JSON body |

### Responses

| Status | Meaning |
|---|---|
| `200 OK` | The run finished. Read `output`, or `error` when `status` is `failed` |
| `202 Accepted` | The run is still in progress. Poll `status_url` until `status` is `succeeded`, `failed` or `cancelled` |

A run object has this shape:

```json
{
  "run_id": "5a1f0c9e-...",
  "workflow_id": "0b7d2e41-...",
  "status": "succeeded",
  "output": { "summary": "..." },
  "error": null,
  "total_tokens": 812,
  "duration_ms": 2140,
  "status_url": null
}
```

### Streaming

With `"stream": true`, the response is a stream of Server-Sent Events. Each `data:` line holds one JSON event:

| Event type | Description |
|---|---|
| `run.started` | The run was created. Includes `run_id` |
| `node.started`, `node.succeeded` | A step began or completed. Includes `node_id` |
| `node.failed` | A step failed. Includes `node_id` and `error` |
| `token` | Model output as it is generated. Includes `node_id` and `text` |
| `run.completed` | The run finished. Carries the same fields as a run object |

Lines beginning with `:` are heartbeats that keep the connection open, and clients should ignore them.

The complete reference is available at [worfilo.com/docs/workflow-api](https://worfilo.com/docs/workflow-api).

## Error handling

| Status | Cause | Resolution |
|---|---|---|
| `400` | The published workflow failed validation | Fix the workflow in Worfilo and publish again |
| `401` | Missing, invalid or revoked API key | Check `WORFILO_API_KEY` |
| `403` | The key is not allowed to run this workflow, or the account is suspended | Use a key scoped to the workflow |
| `404` | The workflow does not exist for this key's account | Check `WORFILO_WORKFLOW_ID` |
| `409` | The workflow has not been published | Publish it in the editor |
| `429` | Rate limit exceeded | Wait for the number of seconds in the `Retry-After` header |

A run can also finish with `status: "failed"`. The request succeeded in that case, and `error` explains why the workflow failed.

## Security

- Keep API keys on the server. Never ship them in browser or mobile code.
- Store keys in environment variables or a secrets manager, never in source control.
- Scope each key to the workflows it runs, and revoke unused keys under **API keys** in Worfilo.

## Building with a coding agent

The [Worfilo MCP server](https://github.com/Worfilo/mcp) lets Claude Code, Cursor, Antigravity and VS Code plan and build workflows, then write this kind of integration into your codebase:

```sh
npx @worfilo/mcp install
```

## License

[MIT](LICENSE)
