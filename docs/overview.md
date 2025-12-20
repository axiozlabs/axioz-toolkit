# Axioz Toolkit Overview

axioz-toolkit is the workflow layer for Axioz. It defines typed primitives for tools and pipelines, and provides a runner that executes steps safely and predictably through adapters.

## What this package provides

- Tool definition (metadata, schema, pipeline)
- Pipeline steps (function, model, transform)
- Input validation (Zod supported by default)
- Runner with trace events
- Adapter interfaces for runtime execution and model generation

## What this package does not do

- It does not implement a sandbox runtime by itself.
- It does not directly integrate with a specific LLM provider.
- It does not manage storage, auth, or workspace policies.

Those concerns belong to the Axioz platform and are injected via adapters.

## Design goals

- Minimal surface area
- Deterministic execution paths
- Explicit permissions for any execution that can cause side effects
- Strong typing and clear contracts
