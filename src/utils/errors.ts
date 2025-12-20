export type ErrorCode =
  | "VALIDATION_ERROR"
  | "PIPELINE_ERROR"
  | "RUNTIME_ERROR"
  | "MODEL_ERROR"
  | "CONFIG_ERROR"
  | "INTERNAL_ERROR";

export class AxiozError extends Error {
  public readonly name = "AxiozError";
  public readonly code: ErrorCode;
  public readonly details?: unknown;
  public readonly cause?: unknown;

  constructor(code: ErrorCode, message: string, opts?: { details?: unknown; cause?: unknown }) {
    super(message);
    this.code = code;
    this.details = opts?.details;
    this.cause = opts?.cause;
  }
}

export function isAxiozError(err: unknown): err is AxiozError {
  return err instanceof AxiozError;
}

export function toAxiozError(err: unknown, fallbackCode: ErrorCode = "INTERNAL_ERROR"): AxiozError {
  if (err instanceof AxiozError) return err;
  if (err instanceof Error) return new AxiozError(fallbackCode, err.message, { cause: err });
  return new AxiozError(fallbackCode, "Unknown error", { details: err });
}
