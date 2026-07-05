---
name: hatchfi-diligence-gate
description: >-
  Reusable deterministic diligence gate for RWA agents on Pharos. Computes RED/YELLOW/GREEN
  from explicit flags, supports attestation-backed mint gating, and exposes MCP/LangChain/Vercel adapters.
---

# SKILL: HatchFi Diligence Gate

## What It Does

- Deterministic diligence rating (`RED` / `YELLOW` / `GREEN`)
- Explainable checks with per-rule reasons
- Attestation-backed mint gate decision
- Composable tools for any agent runtime

## Tool Names

- `diligence_screen`
- `diligence_rate`
- `diligence_attest`
- `diligence_gate_mint`
- `diligence_get_attestation`

## Local Verification

```bash
npm run gate:cli
npm run gate:demo
npm run gate:test
```

## Integration

```ts
import {
  DiligenceGate,
  InMemoryAttestationRegistry,
  createDiligenceSkills,
  toMcpTools
} from "./lib/hatchfi-gate/src/index";

const gate = new DiligenceGate(new InMemoryAttestationRegistry());
const skills = createDiligenceSkills(gate);
const mcpTools = toMcpTools(skills);
```
