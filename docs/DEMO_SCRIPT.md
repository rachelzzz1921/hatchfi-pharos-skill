# HatchFi 2-Min Demo Script

## 0) Setup (10s)

- Run `npm run web:dev`
- Open the demo page — a guided 3-step flow

## 1) Show RED block (30s)

1. **Step 1** — click the **OFAC-sanctioned counterparty** scenario
2. **Step 2** — a giant **RED · BLOCKED** verdict card appears; the `sanctions` check row is ✗
3. Click **Attest evidence → run mint gate** → badge shows **mint DENIED**
4. Narration:
   - "The deterministic gate returns RED with an explicit failed check."
   - "This is fail-closed — attestation of a RED rating cannot pass, so mint is blocked."

## 2) Show GREEN path (35s)

1. **Step 1** — click the **Clean institutional issuer** scenario
2. **Step 2** — verdict flips to **GREEN · ADMITTED**; all seven checks are ✓
3. Click **Attest evidence → run mint gate** → badge shows **mint ALLOWED**
4. Narration:
   - "Same pipeline, clean issuer — GREEN and attested."
   - "The mint gate allows only when both the decision and the attestation pass."

## 3) Show MCP composability (30s)

1. **Step 3** — pick a tool in the MCP playground; the Request pane shows the exact JSON an agent sends
2. Click **Run tool** and read the Response pane. Try:
   - `diligence_screen`
   - `diligence_rate`
   - `diligence_gate_mint`
   - `diligence_get_attestation`
3. Narration:
   - "Every surface — CLI, MCP, web — calls the identical pure-function engine."

## 4) Show judge commands (15s)

Run in terminal:

```bash
npm run judge:package    # gate:test + gate:cli + mcp:probe + judge:readiness
npm run gate:cli         # narrated RED -> GREEN -> attest -> mint gate
```

Narration:
- "One command runs the whole judge package; `gate:cli` narrates the same RED→GREEN story end-to-end."
