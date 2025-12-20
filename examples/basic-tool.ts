import { z } from "zod";
import { defineTool, runTool } from "../src";
import type { RuntimeAdapter, RuntimeResult } from "../src";

const mockRuntime: RuntimeAdapter = {
  async execute(call): Promise<RuntimeResult> {
    if (call.name === "sanitize_input") {
      const task = String(call.args["task"] ?? "").trim();
      return { ok: true, output: { task } };
    }

    if (call.name === "format_output") {
      const draft = String(call.args["draft"] ?? "");
      return { ok: true, output: { code: draft, language: "typescript" } };
    }

    return { ok: false, error: { message: `Unknown function: ${call.name}` } };
  }
};

const tool = defineTool<
  { task: string },
  { code: string; language: string }
>({
  id: "tool.codegen.basic",
  name: "Basic Codegen Tool",
  description: "Minimal example tool that sanitizes input and formats output.",
  tags: ["example", "codegen"],
  inputSchema: z.object({
    task: z.string().min(1)
  }),
  steps: [
    {
      kind: "function",
      name: "Sanitize Input",
      functionName: "sanitize_input",
      permissions: ["fs:none"],
      mapArgs: (input) => ({ task: (input as any).task })
    },
    {
      kind: "transform",
      name: "Create Draft",
      transform: (_input, state) => {
        const sanitized = state["last"] as { task: string };
        return `// ${sanitized.task}\nexport const ok = true;\n`;
      },
      saveAs: "draft"
    },
    {
      kind: "function",
      name: "Format Output",
      functionName: "format_output",
      permissions: ["fs:none"],
      mapArgs: (_input, state) => ({ draft: state["draft"] })
    }
  ],
  mapOutput: (_input, state) => {
    const last = state["last"] as { code: string; language: string };
    return { code: last.code, language: last.language };
  }
});

async function main() {
  const result = await runTool(tool, { task: "Generate a typed API client" }, { runtime: mockRuntime });

  if (!result.ok) {
    console.error("Run failed:", result.error);
    process.exit(1);
  }

  console.log("Output:", result.output);
  console.log("Trace:", { traceId: result.traceId, runId: result.runId });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
