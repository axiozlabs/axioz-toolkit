export type RuntimePermission = "net:http" | "net:rpc" | "fs:read" | "fs:none";

export interface RuntimeExecutionConfig {
  timeoutMs?: number;
  memoryLimitMb?: number;
  permissions: RuntimePermission[];
}

export interface RuntimeFunctionCall {
  name: string;
  args: Record<string, unknown>;
}

export interface RuntimeResult<T = unknown> {
  ok: boolean;
  output?: T;
  error?: {
    message: string;
    code?: string;
    details?: unknown;
  };
  meta?: {
    durationMs?: number;
  };
}

export interface RuntimeAdapter {
  execute<T = unknown>(call: RuntimeFunctionCall, config?: Partial<RuntimeExecutionConfig>): Promise<RuntimeResult<T>>;
}
