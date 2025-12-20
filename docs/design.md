# Toolkit Design Notes

## Steps

### Function step
Represents a sandboxed function execution. It must declare permissions (default-deny).
The runner maps input/state/context into runtime args and expects a structured result.

### Model step
Represents a reasoning step. The toolkit does not call providers directly.
Instead, it delegates to `agentEngine.generate()` to keep policy/routing/audit centralized.

### Transform step
Pure computation step. Used for mapping, formatting, or post-processing. No side effects.

## State
The runner maintains a mutable `state` object during execution:
- `state.last` stores the last step output
- steps may store named outputs via `saveAs`

## Events
The runner emits events:
- run.start / step.start / step.end / run.end / run.error
This is designed for logging, tracing, and UI streaming.
# Toolkit Design Notes

## Steps

### Function step
Represents a sandboxed function execution. It must declare permissions (default-deny).
The runner maps input/state/context into runtime args and expects a structured result.

### Model step
Represents a reasoning step. The toolkit does not call providers directly.
Instead, it delegates to `agentEngine.generate()` to keep policy/routing/audit centralized.

### Transform step
Pure computation step. Used for mapping, formatting, or post-processing. No side effects.

## State
The runner maintains a mutable `state` object during execution:
- `state.last` stores the last step output
- steps may store named outputs via `saveAs`

## Events
The runner emits events:
- run.start / step.start / step.end / run.end / run.error
This is designed for logging, tracing, and UI streaming.
