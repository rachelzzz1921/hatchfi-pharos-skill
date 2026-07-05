# HatchFi 2-Min Demo Script

## 0) Setup (10s)

- Run `npm run web:dev`
- Open the demo page

## 1) Show RED block (30s)

1. In Flags, set `sanctionsHit=true`
2. Click `Run Diligence`
3. Narration:
   - "Deterministic gate returns RED with explicit reason."
   - "This is fail-closed; mint is blocked."

## 2) Show GREEN path (35s)

1. Turn all flags off
2. Click `Run Diligence` (expect GREEN)
3. Click `Attest Current`
4. Click `Gate Mint`
5. Narration:
   - "Now the same pipeline is GREEN and attested."
   - "Mint gate allows only when both decision and attestation pass."

## 3) Show MCP composability (30s)

1. Open MCP Tool Playground
2. Run all 4 tools:
   - `diligence_screen`
   - `diligence_rate`
   - `diligence_gate_mint`
   - `diligence_get_attestation`
3. Narration:
   - "These are reusable primitives any agent can call."

## 4) Show judge commands (15s)

Run in terminal:

```bash
npm run gate:test
npm run gate:demo
npm run judge:readiness
```

Narration:
- "One command path for deterministic logic, one for JSON demo, one for Atlantic readiness."
