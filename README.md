# axioz-toolkit

axioz-toolkit is the workflow and tool orchestration layer for Axioz.  
It provides typed primitives to define tools, validate inputs, compose pipelines, and run execution steps against the Axioz runtime and agent engine.

This repository focuses on:
- predictable execution
- explicit schemas and contracts
- composable workflows
- minimal surface area

## Core Concepts

### Tool
A tool is a reusable workflow definition with:
- metadata (id, name, description, tags)
- input schema
- pipeline steps
- output normalization

### Pipeline
A pipeline is an ordered set of steps that can include:
- function execution (runtime calls)
- model reasoning steps (optional, via router)
- post-processing / formatting

### Runner
The runner executes a tool pipeline with:
- schema validation
- step-level tracing
- structured error handling
- deterministic output boundaries

## Package Layout

- `src/core` core primitives (tool, pipeline, runner)
- `src/schemas` schema utilities and adapters
- `src/adapters` integration adapters (runtime, agent engine)
- `examples` runnable usage examples
- `docs` technical documentation

## Installation

```bash
pnpm add @axioz/toolkit
import { defineTool, runTool } from "@axioz/toolkit";
import { z } from "zod";

const tool = defineTool({
  id: "tool.codegen",
  name: "Code Generator",
  description: "Generates structured code output via agent workflows.",
  inputSchema: z.object({
    task: z.string().min(1)
  }),
  steps: [
    { kind: "function", name: "sanitize_input" },
    { kind: "model", provider: "openai", model: "gpt-5", prompt: "..." },
    { kind: "function", name: "format_output" }
  ]
});

const result = await runTool(tool, { task: "Create a typed API client." });
console.log(result);
pnpm build
pnpm test
pnpm lint
```
Active development. APIs may change until v1.0.
Breaking changes will be documented in releases.
