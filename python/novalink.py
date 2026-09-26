"""A small client for the Novalink Workflow API: run a published workflow and get its output."""

import json
import os
import time
from collections.abc import Iterator
from typing import Any

import httpx

FINISHED = ("succeeded", "failed", "cancelled")


class NovalinkError(Exception):
    def __init__(self, message: str, status: int) -> None:
        super().__init__(message)
        self.status = status


class Novalink:
    def __init__(self, api_key: str | None = None, base_url: str | None = None) -> None:
        api_key = api_key or os.environ.get("NOVALINK_API_KEY")
        if not api_key:
            raise RuntimeError("Set NOVALINK_API_KEY, e.g. in .env")
        self.base_url = (base_url or os.environ.get("NOVALINK_API_URL") or "https://api.novalink.live").rstrip("/")
        self.http = httpx.Client(headers={"Authorization": f"Bearer {api_key}"}, timeout=70)

    def _check(self, response: httpx.Response) -> httpx.Response:
        if response.is_error:
            try:
                detail = response.json().get("detail")
            except ValueError:
                detail = response.text
            raise NovalinkError(f"Novalink answered {response.status_code}: {detail}", response.status_code)
        return response

    def run(self, workflow_id: str, input: Any, timeout: float = 30, poll_every: float = 1.0) -> dict[str, Any]:
        """Runs the workflow's published version and waits for the output, polling if it outlasts `timeout`."""
        url = f"{self.base_url}/v1/workflows/{workflow_id}/runs"
        run = self._check(self.http.post(url, json={"input": input, "wait": True, "timeout": timeout})).json()
        # 202 means it is still running: poll status_url until it finishes
        while run["status"] not in FINISHED and run.get("status_url"):
            time.sleep(poll_every)
            run = self._check(self.http.get(run["status_url"])).json()
        return run

    def stream(self, workflow_id: str, input: Any) -> Iterator[dict[str, Any]]:
        """Runs the workflow and yields its progress as it happens: steps, model tokens, then the result."""
        url = f"{self.base_url}/v1/workflows/{workflow_id}/runs"
        with self.http.stream("POST", url, json={"input": input, "stream": True}, timeout=None) as response:
            if response.is_error:
                response.read()  # a streamed body must be read before its error can be shown
                self._check(response)
            data: list[str] = []
            for line in response.iter_lines():
                if line.startswith("data:"):
                    data.append(line[5:].lstrip())
                elif not line and data:  # a blank line ends one event; ":" lines are heartbeats
                    yield json.loads("\n".join(data))
                    data = []


def input_from(args: list[str]) -> Any:
    """JSON when it parses, otherwise text, which workflows receive as {"message": text}."""
    raw = " ".join(args).strip()
    if not raw:
        return "Hello from the Novalink examples"
    try:
        return json.loads(raw)
    except ValueError:
        return raw


def workflow_id() -> str:
    value = os.environ.get("NOVALINK_WORKFLOW_ID")
    if not value:
        raise RuntimeError("Set NOVALINK_WORKFLOW_ID, e.g. in .env")
    return value
