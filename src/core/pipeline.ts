import type { ModelProvider } from "../adapters/agentEngine";
import type { RuntimePermission } from "../adapters/runtime";

export type StepKind = "function" | "model" | "transform";

export interface BaseStep {
  id?: string;
  kind: StepKind;
  name: string;
  description?: string;
}

export interface FunctionStep extends BaseStep {
  kind: "function";
  functionName: string;
  /**
   * Map context/input into runtime function args.
   * If omitted, runner will pass { input, state, ctx }.
   */
  mapArgs?: (input: unknown, state: Record<string, unknown>, ctx: Record<string, unknown>) => Record<string, unknown>;
  permissions?: RuntimePermission[];
  timeoutMs?: number;
  memoryLimitMb?: number;
}

export interface ModelStep extends BaseStep {
  kind: "model";
  provider: ModelProvider;
  model: string;
  system?: string;
  /**
   * Build prompt based on current input/state.
   */
  buildPrompt: (input: unknown, state: Record<string, unknown>, ctx: Record<string, unknown>) => string;
  temperature?: number;
  maxTokens?: number;
  /**
   * Where to store the model output in state.
   */
  saveAs?: string;
}

export interface TransformStep extends BaseStep {
  kind: "transform";
  transform: (input: unknown, state: Record<string, unknown>, ctx: Record<string, unknown>) => unknown;
  saveAs?: string;
}

export type PipelineStep = FunctionStep | ModelStep | TransformStep;

export interface Pipeline {
  steps: PipelineStep[];
}

export function definePipeline(steps: PipelineStep[]): Pipeline {
  return { steps };
}
