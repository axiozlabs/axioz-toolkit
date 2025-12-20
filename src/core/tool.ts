import type { Pipeline, PipelineStep } from "./pipeline";

export interface ToolMeta {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  version?: string;
}

export interface ToolDefinition<TInput = unknown, TOutput = unknown> extends ToolMeta {
  /**
   * Optional agent binding (if you want tools to be attached to an agent).
   * Your runner can also accept ctx.agentId separately.
   */
  agentId?: string;

  /**
   * Optional schema descriptor (actual parsing happens in validate.ts).
   * Keep it generic so non-zod schemas can be plugged later.
   */
  inputSchema?: unknown;

  pipeline: Pipeline;

  /**
   * Optional final output mapper.
   */
  mapOutput?: (input: TInput, state: Record<string, unknown>) => TOutput;
}

export function defineTool<TInput = unknown, TOutput = unknown>(def: {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  version?: string;
  agentId?: string;
  inputSchema?: unknown;
  steps: PipelineStep[];
  mapOutput?: (input: TInput, state: Record<string, unknown>) => TOutput;
}): ToolDefinition<TInput, TOutput> {
  return {
    id: def.id,
    name: def.name,
    description: def.description,
    tags: def.tags ?? [],
    version: def.version,
    agentId: def.agentId,
    inputSchema: def.inputSchema,
    pipeline: { steps: def.steps },
    mapOutput: def.mapOutput
  };
}
