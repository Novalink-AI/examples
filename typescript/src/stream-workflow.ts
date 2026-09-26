import { Worfilo, inputFrom, workflowId } from "./worfilo.js";

for await (const event of new Worfilo().stream(workflowId(), inputFrom(process.argv.slice(2)))) {
  switch (event.type) {
    case "token":
      process.stdout.write(event.text);
      break;
    case "node.started":
      console.error(`\n> ${event.node_id}`);
      break;
    case "node.failed":
      console.error(`\n! ${event.node_id}: ${event.error ?? "failed"}`);
      break;
    case "run.completed":
      console.log(`\n\n${event.status}:`, JSON.stringify(event.output, null, 2));
      if (event.status !== "succeeded") process.exitCode = 1;
      break;
  }
}
