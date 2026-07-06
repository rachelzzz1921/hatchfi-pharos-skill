# HatchFi 2-Min Demo Script

## 0) Setup (10s)

- Run `npm run web:dev`
- Open the demo page — a guided 3-step flow

## 1) Show RED block (35s)

1. **Step 1** — pick the **OFAC-sanctioned counterparty**
2. **Step 2** — point out ② and ③ are **locked**. Press **① Run screening** → giant **RED · BLOCKED**, `sanctions` ✗
3. Press **② Attest evidence**, then **③ Attempt mint** → status bar reads `Screening: RED → Attestation: recorded (RED) → Mint: MINT DENIED`
4. Narration:
   - "You're the compliance operator. Each action unlocks the next — the same order the contract enforces."
   - "A RED attestation exists but is not passable, so the mint is refused. Fail-closed."

## 2) Show GREEN path (30s)

1. **Step 1** — pick **Clean institutional issuer**, run ① ② ③ again
2. Verdict flips to **GREEN · ADMITTED**, badge shows **✓ MINT ALLOWED**
3. Narration:
   - "Same three actions, clean counterparty — the gate admits and the mint passes."

## 3) Show the audit trail + MCP composability (30s)

1. **Step 3** — scroll the **audit log**: six timestamped entries, one per action; expand one to show the raw JSON
2. Open **Raw MCP tool access** — the Request pane is the exact JSON an agent sends; run `diligence_gate_mint`
3. Narration:
   - "Every operator action is on the record — and an AI agent calls the identical tools over MCP."

## 4) Show judge commands (15s)

Run in terminal:

```bash
npm run judge:package    # gate:test + gate:cli + mcp:probe + judge:readiness
npm run gate:cli         # narrated RED -> GREEN -> attest -> mint gate
```

Narration:
- "One command runs the whole judge package; `gate:cli` narrates the same RED→GREEN story end-to-end."
