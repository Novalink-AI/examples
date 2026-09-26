import json
import sys

from novalink import Novalink, input_from, workflow_id

run = Novalink().run(workflow_id(), input_from(sys.argv[1:]))

if run["status"] != "succeeded":
    sys.exit(f"Run {run['run_id']} {run['status']}: {run['error']}")
print(json.dumps(run["output"], indent=2))
print(f"\n{run['total_tokens']} tokens in {run['duration_ms']} ms", file=sys.stderr)
