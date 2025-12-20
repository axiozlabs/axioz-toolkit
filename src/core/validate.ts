import { z } from "zod";
import { AxiozError } from "../utils/errors";

/**
 * Axioz supports pluggable schema validators.
 * For now, we support Zod out of the box.
 */
export function validateInput<T = unknown>(schema: unknown | undefined, input: unknown): T {
  if (!schema) return input as T;

  // Zod schema
  if (schema instanceof z.ZodType) {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      throw new AxiozError("VALIDATION_ERROR", "Tool input validation failed", {
        details: parsed.error.flatten()
      });
    }
    return parsed.data as T;
  }

  // Unknown schema type
  throw new AxiozError("CONFIG_ERROR", "Unsupported inputSchema type. Provide a Zod schema or omit inputSchema.", {
    details: { schemaType: typeof schema }
  });
}
