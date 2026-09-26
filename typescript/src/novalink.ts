// A small client for the Novalink Workflow API: run a published workflow and get its output.

export type RunStatus = "queued" | "running" | "succeeded" | "failed" | "cancelled";

export interface Run {
  run_id: string;
  workflow_id: string;
  status: RunStatus;
  output: unknown;
  error: string | null;
  total_tokens: number;
  duration_ms: number | null;
  status_url: string | null; // set while the run is still going
}

export type StreamEvent =
  | { type: "run.started"; run_id: string }
  | { type: "token"; node_id: string; text: string }
  | { type: "node.started" | "node.succeeded"; node_id: string }
  | { type: "node.failed"; node_id: string; error?: string }
  | ({ type: "run.completed" } & Run);

const FINISHED: RunStatus[] = ["succeeded", "failed", "cancelled"];

export class NovalinkError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export class Novalink {
  constructor(
    private readonly apiKey = process.env.NOVALINK_API_KEY ?? "",
    private readonly baseUrl = process.env.NOVALINK_API_URL ?? "https://api.novalink.live",
  ) {
    if (!this.apiKey) throw new Error("Set NOVALINK_API_KEY, e.g. in .env");
  }

  private headers(): Record<string, string> {
    return { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" };
  }

  private async send(url: string, init?: RequestInit): Promise<Response> {
    const response = await fetch(url, { ...init, headers: this.headers() });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { detail?: unknown };
      const detail = typeof body.detail === "string" ? body.detail : JSON.stringify(body.detail ?? response.statusText);
      throw new NovalinkError(`Novalink answered ${response.status}: ${detail}`, response.status);
    }
    return response;
  }

  /** Runs the workflow's published version and waits for the output, polling if it outlasts `timeout`. */
  async run(workflowId: string, input: unknown, { timeout = 30, pollEveryMs = 1000 } = {}): Promise<Run> {
    const response = await this.send(`${this.baseUrl}/v1/workflows/${workflowId}/runs`, {
      method: "POST",
      body: JSON.stringify({ input, wait: true, timeout }),
    });
    let run = (await response.json()) as Run;
    // 202 means it is still running: poll status_url until it finishes
    while (!FINISHED.includes(run.status) && run.status_url) {
      await new Promise((resolve) => setTimeout(resolve, pollEveryMs));
      run = (await (await this.send(run.status_url)).json()) as Run;
    }
    return run;
  }

  /** Runs the workflow and yields its progress as it happens: steps, model tokens, then the result. */
  async *stream(workflowId: string, input: unknown): AsyncGenerator<StreamEvent> {
    const response = await this.send(`${this.baseUrl}/v1/workflows/${workflowId}/runs`, {
      method: "POST",
      body: JSON.stringify({ input, stream: true }),
    });
    if (!response.body) return;
    const decoder = new TextDecoder();
    let buffer = "";
    for await (const chunk of response.body) {
      buffer += decoder.decode(chunk as Uint8Array, { stream: true });
      let end: number;
      while ((end = buffer.indexOf("\n\n")) !== -1) {
        const message = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        // lines starting with ":" are heartbeats that keep the connection open
        const data = message
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data) yield JSON.parse(data) as StreamEvent;
      }
    }
  }
}

/** The command line input: JSON when it parses, otherwise text, which workflows receive as {"message": text}. */
export function inputFrom(args: string[]): unknown {
  const raw = args.join(" ").trim();
  if (!raw) return "Hello from the Novalink examples";
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function workflowId(): string {
  const id = process.env.NOVALINK_WORKFLOW_ID;
  if (!id) throw new Error("Set NOVALINK_WORKFLOW_ID, e.g. in .env");
  return id;
}
