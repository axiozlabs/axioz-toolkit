import { z } from "zod";
import { AxiozError } from "../utils/errors";

export type ZodSchema<T> = z.ZodType<T>;

export function parseWithZod<T>(schema: ZodSchema<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new AxiozError("VALIDATION_ERROR", "Input validation failed", {
      details: result.error.flatten()
    });
  }
  return result.data;
}
