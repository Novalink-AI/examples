import { Novalink, inputFrom, workflowId } from "./novalink.js";

const run = await new Novalink().run(workflowId(), inputFrom(process.argv.slice(2)));

if (run.status !== "succeeded") {
  console.error(`Run ${run.run_id} ${run.status}: ${run.error}`);
  process.exit(1);
}
console.log(JSON.stringify(run.output, null, 2));
console.error(`\n${run.total_tokens} tokens in ${run.duration_ms} ms`);
