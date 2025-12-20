import { z } from "zod";
import { defineTool, runTool } from "../src";
import type { RuntimeAdapter, RuntimeResult, AgentEngineAdapter, AgentContext, ModelRequest, ModelResponse } from "../src";

const mockRuntime: RuntimeAdapter = {
  async execute(call): Promise<RuntimeResult> {
    if (call.name === "save_file") {
      return { ok: true, output: { saved: true, path: "/tmp/output.txt" } };
    }
    return { ok: false, error: { message: `Unknown function: ${call.name}` } };
  }
};

const mockAgentEngine: AgentEngineAdapter = {
  async generate(_ctx: AgentContext, req: ModelRequest): Promise<ModelResponse> {
    // Dummy model response for demo/testing
    return {
      provider: req.provider,
      model: req.model,
      text: `Draft spec for: ${req.prompt.slice(0, 60)}...`,
      raw: { mocked: true }
    };
  }
};

const tool = defineTool<{ topic: string }, { spec: string; savedPath?: string }>({
  id: "tool.spec.pipeline",
  name: "Spec Pipeline Tool",
  description: "Example pipeline with a model step and a function step.",
  tags: ["example", "spec"],
  inputSchema: z.object({
    topic: z.string().min(1)
  }),
  steps: [
    {
      kind: "model",
      name: "Generate Draft Spec",
      provider: "openai",
      model: "gpt-5",
      buildPrompt: (input) => `Write a technical spec outline for: ${(input as any).topic}`,
      saveAs: "spec"
    },
    {
      kind: "function",
      name: "Save Spec",
      functionName: "save_file",
      permissions: ["fs:read"], // example only; in real life you'd use fs:write etc.
      mapArgs: (_input, state) => ({ content: state["spec"] })
    }
  ],
  mapOutput: (_input, state) => ({
    spec: String(state["spec"] ?? ""),
    savedPath: (state["last"] as any)?.path
  })
});

async function main() {
  const result = await runTool(tool, { topic: "Execution-first AI agents" }, { runtime: mockRuntime, agentEngine: mockAgentEngine });

  if (!result.ok) {
    console.error(result.error);
    process.exit(1);
  }

  console.log(result.output);
}

main().catch(console.error);
