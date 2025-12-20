export interface Timing {
  startedAtMs: number;
  endedAtMs: number;
  durationMs: number;
}

export function nowMs(): number {
  return Date.now();
}

export function measure<T>(fn: () => Promise<T> | T): Promise<{ value: T; timing: Timing }> {
  const startedAtMs = nowMs();
  return Promise.resolve(fn()).then((value) => {
    const endedAtMs = nowMs();
    return { value, timing: { startedAtMs, endedAtMs, durationMs: endedAtMs - startedAtMs } };
  });
}
