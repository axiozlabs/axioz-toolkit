export type ModelProvider = "openai" | "anthropic" | "gemini" | "deepseek" | "groq" | "local";

export interface ModelRequest {
  provider: ModelProvider;
  model: string;
  system?: string;
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ModelResponse {
  provider: ModelProvider;
  model: string;
  text: string;
  raw?: unknown;
}

export interface AgentContext {
  agentId: string;
  toolId?: string;
  workspaceId?: string;
  traceId: string;
  runId: string;
}

export interface AgentEngineAdapter {
  /**
   * Optional: call model through agent engine (policy, routing, audit).
   * If your system does model routing elsewhere, you can ignore model steps.
   */
  generate?(ctx: AgentContext, req: ModelRequest): Promise<ModelResponse>;
}
