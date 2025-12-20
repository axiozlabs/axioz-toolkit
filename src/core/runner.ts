import type { ToolDefinition } from "./tool";
import type { PipelineStep, FunctionStep, ModelStep, TransformStep } from "./pipeline";
import type { RuntimeAdapter, RuntimeExecutionConfig } from "../adapters/runtime";
import type { AgentEngineAdapter, AgentContext, ModelRequest } from "../adapters/agentEngine";
import { validateInput } from "./validate";
import { AxiozError, toAxiozError } from "../utils/errors";
import { createRunId, createTraceId } from "../utils/ids";
import { measure } from "../utils/timing";

export interface RunOptions {
  /**
   * Provide runtime adapter to execute function steps.
   */
  runtime: RuntimeAdapter;

  /**
   * Optional agent engine adapter for model steps.
   */
  agentEngine?: AgentEngineAdapter;

  /**
   * Execution identity / context.
   */
  ctx?: Partial<AgentContext>;

  /**
   * Default runtime execution config (can be overridden per step).
   */
  runtimeDefaults?: Partial<RuntimeExecutionConfig>;

  /**
   * Called on each step for trace streaming.
   */
  onEvent?: (event: RunnerEvent) => void;
}

export type RunnerEvent =
  | { type: "run.start"; traceId: string; runId: string; toolId: string; startedAtMs: number }
  | { type: "step.start"; traceId: string; runId: string; stepIndex: number; step: PipelineStep; startedAtMs: number }
  | {
      type: "step.end";
      traceId: string;
      runId: string;
      stepIndex: number;
      step: PipelineStep;
      endedAtMs: number;
      durationMs: number;
      ok: boolean;
      outputPreview?: unknown;
    }
  | { type: "run.end"; traceId: string; runId: string; toolId: string; ok: boolean; endedAtMs: number; durationMs: number }
  | { type: "run.error"; traceId: string; runId: string; toolId: string; error: { code: string; message: string; details?: unknown } };

export interface ToolRunResult<TOutput = unknown> {
  ok: boolean;
  traceId: string;
  runId: string;
  output?: TOutput;
  state: Record<string, unknown>;
  error?: { code: string; message: string; details?: unknown };
}

export async function runTool<TInput = unknown, TOutput = unknown>(
  tool: ToolDefinition<TInput, TOutput>,
  rawInput: unknown,
  options: RunOptions
): Promise<ToolRunResult<TOutput>> {
  const traceId = options.ctx?.traceId ?? createTraceId(tool.id);
  const runId = options.ctx?.runId ?? createRunId(tool.id);

  const ctx: AgentContext = {
    agentId: options.ctx?.agentId ?? tool.agentId ?? "unknown-agent",
    toolId: tool.id,
    workspaceId: options.ctx?.workspaceId,
    traceId,
    runId
  };

  const emit = (e: RunnerEvent) => options.onEvent?.(e);

  const startedAtMs = Date.now();
  emit({ type: "run.start", traceId, runId, toolId: tool.id, startedAtMs });

  try {
    const input = validateInput<TInput>(tool.inputSchema, rawInput);
    const state: Record<string, unknown> = {};

    for (let i = 0; i < tool.pipeline.steps.length; i++) {
      const step = tool.pipeline.steps[i]!;
      emit({ type: "step.start", traceId, runId, stepIndex: i, step, startedAtMs: Date.now() });

      const { value, timing } = await measure(async () => executeStep(step, input, state, ctx, options));
      emit({
        type: "step.end",
        traceId,
        runId,
        stepIndex: i,
        step,
        endedAtMs: timing.endedAtMs,
        durationMs: timing.durationMs,
        ok: true,
        outputPreview: preview(value)
      });

      // Default: store last output
      state["last"] = value;
    }

    const output = tool.mapOutput ? tool.mapOutput(input, state) : (state["last"] as TOutput);

    const endedAtMs = Date.now();
    emit({
      type: "run.end",
      traceId,
      runId,
      toolId: tool.id,
      ok: true,
      endedAtMs,
      durationMs: endedAtMs - startedAtMs
    });

    return { ok: true, traceId, runId, output, state };
  } catch (err) {
    const axErr = toAxiozError(err);
    emit({
      type: "run.error",
      traceId,
      runId,
      toolId: tool.id,
      error: { code: axErr.code, message: axErr.message, details: axErr.details }
    });

    const endedAtMs = Date.now();
    emit({
      type: "run.end",
      traceId,
      runId,
      toolId: tool.id,
      ok: false,
      endedAtMs,
      durationMs: endedAtMs - startedAtMs
    });

    return {
      ok: false,
      traceId,
      runId,
      state: {},
      error: { code: axErr.code, message: axErr.message, details: axErr.details }
    };
  }
}

async function executeStep(
  step: PipelineStep,
  input: unknown,
  state: Record<string, unknown>,
  ctx: AgentContext,
  options: RunOptions
): Promise<unknown> {
  const stepCtx = { ...ctx };

  if (step.kind === "function") return executeFunctionStep(step, input, state, stepCtx, options);
  if (step.kind === "model") return executeModelStep(step, input, state, stepCtx, options);
  if (step.kind === "transform") return executeTransformStep(step, input, state, stepCtx, options);

  throw new AxiozError("PIPELINE_ERROR", `Unknown step kind: ${(step as any)?.kind}`, { details: step });
}

async function executeFunctionStep(
  step: FunctionStep,
  input: unknown,
  state: Record<string, unknown>,
  ctx: Record<string, unknown>,
  options: RunOptions
): Promise<unknown> {
  const args = step.mapArgs ? step.mapArgs(input, state, ctx) : { input, state, ctx };

  const config: Partial<RuntimeExecutionConfig> = {
    ...options.runtimeDefaults,
    permissions: step.permissions ?? options.runtimeDefaults?.permissions,
    timeoutMs: step.timeoutMs ?? options.runtimeDefaults?.timeoutMs,
    memoryLimitMb: step.memoryLimitMb ?? options.runtimeDefaults?.memoryLimitMb
  };

  // If permissions are missing, fail explicitly (default-deny mindset)
  if (!config.permissions || config.permissions.length === 0) {
    throw new AxiozError(
      "CONFIG_ERROR",
      `Missing runtime permissions for function step "${step.name}".`,
      { details: { stepName: step.name, functionName: step.functionName } }
    );
  }

  const res = await options.runtime.execute({ name: step.functionName, args }, config);
  if (!res.ok) {
    throw new AxiozError("RUNTIME_ERROR", res.error?.message ?? "Runtime execution failed", {
      details: res.error?.details ?? res.error
    });
  }

  return res.output;
}

async function executeModelStep(
  step: ModelStep,
  input: unknown,
  state: Record<string, unknown>,
  ctx: AgentContext,
  options: RunOptions
): Promise<unknown> {
  if (!options.agentEngine?.generate) {
    throw new AxiozError(
      "CONFIG_ERROR",
      `Model step "${step.name}" requires agentEngine.generate(), but no agentEngine adapter was provided.`,
      { details: { stepName: step.name, provider: step.provider, model: step.model } }
    );
  }

  const req: ModelRequest = {
    provider: step.provider,
    model: step.model,
    system: step.system,
    prompt: step.buildPrompt(input, state, ctx),
    temperature: step.temperature,
    maxTokens: step.maxTokens
  };

  const resp = await options.agentEngine.generate(ctx, req);
  const text = resp.text;

  if (step.saveAs) state[step.saveAs] = text;

  return text;
}

function executeTransformStep(
  step: TransformStep,
  input: unknown,
  state: Record<string, unknown>,
  ctx: Record<string, unknown>
): unknown {
  const out = step.transform(input, state, ctx);
  if (step.saveAs) state[step.saveAs] = out;
  return out;
}

function preview(v: unknown): unknown {
  if (v == null) return v;
  if (typeof v === "string") return v.length > 180 ? `${v.slice(0, 180)}…` : v;
  if (typeof v === "number" || typeof v === "boolean") return v;
  if (Array.isArray(v)) return { type: "array", length: v.length };
  if (typeof v === "object") return { type: "object" };
  return { type: typeof v };
}
