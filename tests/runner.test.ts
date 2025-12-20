import { describe, it, expect } from "vitest";
import { z } from "zod";
import { defineTool, runTool } from "../src";
import type { RuntimeAdapter, RuntimeResult, AgentEngineAdapter, AgentContext, ModelRequest, ModelResponse } from "../src";

function makeRuntime(): RuntimeAdapter {
  return {
    async execute(call): Promise<RuntimeResult> {
      if (call.name === "echo") return { ok: true, output: call.args };
      if (call.name === "fail") return { ok: false, error: { message: "boom" } };
      return { ok: false, error: { message: `unknown:${call.name}` } };
    }
  };
}

function makeAgentEngine(): AgentEngineAdapter {
  return {
    async generate(_ctx: AgentContext, req: ModelRequest): Promise<ModelResponse> {
      return { provider: req.provider, model: req.model, text: `ok:${req.prompt}` };
    }
  };
}

describe("runTool", () => {
  it("validates input with zod", async () => {
    const tool = defineTool({
      id: "tool.test.validation",
      name: "Validation Tool",
      inputSchema: z.object({ n: z.number().int().positive() }),
      steps: [
        {
          kind: "transform",
          name: "noop",
          transform: (input) => input
        }
      ]
    });

    const res = await runTool(tool, { n: -1 }, { runtime: makeRuntime() });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("VALIDATION_ERROR");
  });

  it("requires permissions for function steps", async () => {
    const tool = defineTool({
      id: "tool.test.perms",
      name: "Perm Tool",
      inputSchema: z.object({ a: z.string() }),
      steps: [
        {
          kind: "function",
          name: "Echo",
          functionName: "echo"
          // permissions missing on purpose
        } as any
      ]
    });

    const res = await runTool(tool, { a: "x" }, { runtime: makeRuntime() });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("CONFIG_ERROR");
  });

  it("executes transform + function steps", async () => {
    const tool = defineTool<{ a: string }, { a: string; b: string }>({
      id: "tool.test.pipeline",
      name: "Pipeline Tool",
      inputSchema: z.object({ a: z.string() }),
      steps: [
        {
          kind: "transform",
          name: "add-b",
          transform: (input) => {
            const a = (input as any).a;
            return { a, b: "y" };
          },
          saveAs: "payload"
        },
        {
          kind: "function",
          name: "echo",
          functionName: "echo",
          permissions: ["fs:none"],
          mapArgs: (_input, state) => state["payload"] as any
        }
      ],
      mapOutput: (_input, state) => state["last"] as any
    });

    const res = await runTool(tool, { a: "x" }, { runtime: makeRuntime() });
    expect(res.ok).toBe(true);
    expect(res.output).toEqual({ a: "x", b: "y" });
  });

  it("supports model steps when agentEngine is provided", async () => {
    const tool = defineTool({
      id: "tool.test.model",
      name: "Model Tool",
      inputSchema: z.object({ topic: z.string() }),
      steps: [
        {
          kind: "model",
          name: "gen",
          provider: "openai",
          model: "gpt-5",
          buildPrompt: (input) => `topic:${(input as any).topic}`,
          saveAs: "text"
        }
      ],
      mapOutput: (_input, state) => ({ text: state["text"] })
    });

    const res = await runTool(tool, { topic: "axioz" }, { runtime: makeRuntime(), agentEngine: makeAgentEngine() });
    expect(res.ok).toBe(true);
    expect(res.output).toEqual({ text: "ok:topic:axioz" });
  });

  it("returns RUNTIME_ERROR when runtime fails", async () => {
    const tool = defineTool({
      id: "tool.test.runtimefail",
      name: "Fail Tool",
      inputSchema: z.object({ x: z.string() }),
      steps: [
        {
          kind: "function",
          name: "fail",
          functionName: "fail",
          permissions: ["fs:none"]
        }
      ]
    });

    const res = await runTool(tool, { x: "1" }, { runtime: makeRuntime() });
    expect(res.ok).toBe(false);
    expect(res.error?.code).toBe("RUNTIME_ERROR");
  });
});
