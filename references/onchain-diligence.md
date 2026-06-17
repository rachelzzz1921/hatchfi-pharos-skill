# Reference: On-chain diligence gate (onchain-diligence)

> **Capability**: Before issuing any RWA asset, run **read-only, zero-gas** on-chain diligence on target addresses (custodian / issuer / large subscriber) and produce a red/yellow/green risk profile. **Every conclusion must be verifiable** — each line traces to a specific `cast` command and return value.
> **Risk tier**: 🟢 Low (read-only only; agent runs automatically; no human confirm).
> **Gate behavior**: On RED rating, agent must refuse all subsequent issuance ops (`state.diligence.passed = false`).

---

## When to trigger

User intent includes: "check this address first", "is this custodian trustworthy", "pre-issuance diligence", "can we issue tokens to it" — **mandatory** diligence before `mint` / `registerIdentity` / `forcedTransfer` to that address.

---

## Checks & commands (all read-only; target = address under review; RPC = pharos_atlantic)

Each check yields deterministic `flag ∈ {ok, warn, risk}`. **risk is a hard veto for the gate** — RED → refuse issuance is reachable, not decorative.

| check | cast command | Meaning | flag rules (deterministic) |
|---|---|---|---|
| `denylist` | Compare against `state.config.denylist[]` (issuer-maintained block/sanctions list) | Is target blocked? | Hit → **risk**; miss → ok |
| `is_contract` | `cast code <target> --rpc-url $RPC` | EOA vs contract | `0x` (EOA) → ok; bytecode present → warn (investors usually KYC'd EOAs; issuing to opaque contracts needs review) |
| `code_size` | `cast codesize <target> --rpc-url $RPC` | Contract bytecode size | Not a contract → ok; contract with `> 0` → warn; **contract with codesize `== 0` (self-destructed) → risk** |
| `balance` | `cast balance <target> --rpc-url $RPC` | Native PHRS balance | `> 0` → ok; `== 0` → warn (empty address, no gas) |
| `tx_count` | `cast nonce <target> --rpc-url $RPC` | Outbound tx count (activity) | `> 0` → ok; `== 0` → warn (brand-new address, no history) |

> Commands follow Foundry `cast`. `$RPC` = `https://atlantic.dplabs-internal.com` (Pharos Atlantic testnet, chainId 688689).
> On-chain checks are view/read-only RPC — **no txs, no gas, zero risk**; `denylist` is local list comparison — overall 🟢 low, agent auto-runs.
>
> **risk triggers (any one → RED, gate closed)**:
> 1. `denylist` hit on issuer block/sanctions list;
> 2. target is a contract with `codesize == 0` (was deployed, now self-destructed — code untrusted).
>
> Issuer can maintain `state.config.denylist` for blocked addresses — gives compliance-first a real refuse path.

---

## evidence structure (written to state.diligence.evidence — verifiable)

Each check produces one evidence record:

```json
{
  "check": "is_contract",
  "cmd": "cast code 0xABC... --rpc-url $RPC",
  "result": "0x",
  "infer": "Target is EOA (externally owned account), not a contract",
  "flag": "ok"
}
```

`flag` values: `ok` / `warn` / `risk`.

---

## Rating rules (fixed — not agent subjective judgment)

From all evidence flags, **deterministic and reproducible**:

- **🔴 RED**: any flag = `risk`. → `passed = false`, **gate closed**, refuse issuance.
- **🟡 YELLOW**: no risk, but ≥ 2 flags = `warn`. → `passed = true` but surface risk; recommend human review.
- **🟢 GREEN**: no risk, and warn ≤ 1. → `passed = true`, proceed to issuance.

> Rating is a pure function of evidence: `rating = f(evidence[].flag)`. Same chain data → same rating — that's why it's trustworthy.

---

## Gate enforcement (1-C)

After diligence, agent writes `state.json`:
```json
"diligence": { "target": "0x...", "rating": "GREEN", "passed": true, "evidence": [...] }
```

Before any issuance op (mint / registerIdentity for target / forcedTransfer to target), agent **must** read `state.diligence`:
- `passed == false` or `rating == "RED"` → **refuse**, reply: "Target failed diligence (RED). Compliance-first: cannot issue. Basis: <list risk evidence>."
- `rating == "YELLOW"` → extra risk warning before execute; suggest human review.
- `rating == "GREEN"` → normal issuance flow.

This turns "compliance first" from a slogan into a **non-bypassable code-level gate**.

---

## User-facing output format (with evidence)

```
Diligence: 🟡 YELLOW (passed — review recommended)
Target: 0xABC...

Evidence:
  ✓ [ok]   is_contract: cast code → 0x, confirmed EOA
  ⚠ [warn] activity:    cast nonce → 0, brand-new address
  ⚠ [warn] balance:    cast balance → 0 PHRS, no gas
  
Rating: no risk + 2 warn → YELLOW
Recommendation: issuance allowed; confirm real identity before whitelisting.
```

RED example (gate closed):

```
Diligence: 🔴 RED (NOT passed — issuance refused)
Target: 0xBAD...

Evidence:
  ✗ [risk] denylist:  hit state.config.denylist (issuer block list)
  ✓ [ok]   is_contract: cast code → 0x, confirmed EOA

Rating: 1 risk → RED
Action: write state.diligence.passed=false; refuse all issuance to this address.
```
