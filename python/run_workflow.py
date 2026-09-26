import json
import sys

from worfilo import Worfilo, input_from, workflow_id

run = Worfilo().run(workflow_id(), input_from(sys.argv[1:]))

if run["status"] != "succeeded":
    sys.exit(f"Run {run['run_id']} {run['status']}: {run['error']}")
print(json.dumps(run["output"], indent=2))
print(f"\n{run['total_tokens']} tokens in {run['duration_ms']} ms", file=sys.stderr)
