# DoraHacks BUIDL Submission Draft

## Project Name

HatchFi · Chain Hatch for Compliant RWAs

## One-line Pitch

An agent-native compliant RWA issuance stack on Pharos with deterministic diligence gating, identity-bound recovery, and judge-ready verification scripts.

## Problem

- Existing agent demos often look smart but hide trust assumptions.
- RWA issuance requires deterministic controls, identity binding, and auditable operations.
- Judges need a quick, visible, reproducible way to validate claims.

## Solution

HatchFi combines:

1. **Hardened ERC-3643-style token** with role separation and two-step identity-bound recovery.
2. **Deterministic diligence primitive** (`lib/hatchfi-gate`) exposing reusable tools:
   - `diligence_screen`
   - `diligence_rate`
   - `diligence_gate_mint`
   - `diligence_get_attestation`
3. **Visible demo layer** (`web/`) with MCP playground.
4. **One-command readiness script** (`npm run judge:readiness`) for read-only Atlantic verification.

## What’s New In This Overhaul

- `mint(address,uint256,bytes32)` now requires passable on-chain diligence evidence.
- Recovery now requires same identity binding and two-phase execution:
  `proposeRecoveryAddress` -> `executeRecoveryAddress`.
- Operator powers split by role:
  `COMPLIANCE_ROLE`, `MINTER_ROLE`, `RECOVERY_ROLE`.

## Judge Quick Start

```bash
npm install
npm run gate:test
npm run gate:demo
npm run judge:readiness
npm run web:dev
```

## Demo Story (2 minutes)

1. Flip `sanctionsHit=true` -> RED.
2. Clear flags -> GREEN.
3. Attest -> Gate Mint -> allowed true.
4. Run all MCP tools in demo playground.

## Repos / Artifacts

- Core contract: `src/CompliantRWAToken.sol`
- Deterministic primitive: `lib/hatchfi-gate/`
- MCP server: `mcp-server/index.ts`
- Web demo: `web/`
- Judge script: `scripts/judge-readiness.mjs`
- Slides: `docs/slides.html`
