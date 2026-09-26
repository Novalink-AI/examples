import json
import sys

from worfilo import Worfilo, input_from, workflow_id

for event in Worfilo().stream(workflow_id(), input_from(sys.argv[1:])):
    kind = event["type"]
    if kind == "token":
        print(event["text"], end="", flush=True)
    elif kind == "node.started":
        print(f"\n> {event['node_id']}", file=sys.stderr)
    elif kind == "node.failed":
        print(f"\n! {event['node_id']}: {event.get('error', 'failed')}", file=sys.stderr)
    elif kind == "run.completed":
        print(f"\n\n{event['status']}:", json.dumps(event["output"], indent=2))
        if event["status"] != "succeeded":
            sys.exit(1)
