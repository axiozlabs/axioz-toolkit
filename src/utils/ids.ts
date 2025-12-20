export function createId(prefix: string, seed?: string): string {
  const rand = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  const base = seed ? `${seed}-${time}-${rand}` : `${time}-${rand}`;
  return `${prefix}.${base}`;
}

export function createTraceId(seed?: string): string {
  return createId("trace", seed);
}

export function createRunId(seed?: string): string {
  return createId("run", seed);
}
