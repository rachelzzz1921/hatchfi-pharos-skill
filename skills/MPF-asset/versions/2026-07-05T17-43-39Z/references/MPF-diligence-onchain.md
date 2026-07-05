# MPF-bound reference

> Asset: `Manhattan Property Fund` (`MPF`)
> Token: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
> This file was generated from `references/onchain-diligence.md`.

# Reference: On-chain diligence gate (onchain-diligence)

> **Capability**: Layer **#2–#10** — read-only chain diligence on Pharos Atlantic (standard EVM + cast).
> **Risk tier**: 🟢 Low (read-only; agent auto-runs; no human confirm).
> **Gate**: RED → `state.diligence.passed = false` → refuse issuance.
> **Order**: Run `sanctions-screening.md` (#1/#11) first, then this table.

Set `RPC=$PHAROS_RPC` or `$RPC` — append `--rpc-url $RPC` to every cast command.

---

## Pipeline

```
Stage −1  distribution_eligibility (offchain)  →  offchain-diligence.md
Stage 0   offchain-diligence.md
Stage 1   checks_run / skipped_checks
Stage 2   sanctions-screening → THIS FILE (#2–#10, #10b) → merge evidence → rate
```

---

## When to trigger

`target_address` known and read-only health check required. Mandatory before `mint` / `registerIdentity` / `forcedTransfer` to that address.

---

## Check table (#2–#10)

| # | check | cast cmd | flag rules | Can produce risk? |
|---|---|---|---|---|
| 2 | `is_contract` | `cast code <a>` | `0x` → ok (EOA); bytecode → **warn** | no |
| 3 | `code_size` | `cast codesize <a>` | was contract, now `0` (self-destructed) → **risk**; else ok/warn | **yes** |
| 4 | `balance` | `cast balance <a>` | `0` → **warn**; &gt;0 → ok | no |
| 5 | `tx_count` | `cast nonce <a>` | `0` → **warn**; &gt;0 → ok | no |
| 5b | `wallet_maturity` | `cast nonce <a>` | nonce &lt; 5 → **warn**; ≥5 → ok | no |
| 6 | `account_age` † | explorer first-tx timestamp or `cast logs` scan | &lt;7d → **warn**; lookup fail → **warn**(`age_unknown`) | no |
| 7 | `counterparty_set` † | `cast logs` scan from/to; cross denylist | any denylist counterparty → **risk**; high concentration → **warn** | **yes** |
| 8 | `contract_verified` ‡ | Pharos explorer verified-source API | unverified → **warn** | no |
| 9 | `privileged_powers` | `cast call <a> "owner()(address)"` + storage reads | single EOA owner + unbounded mint + no timelock → **risk** (stacked); else **warn** | **yes** (stacked) |
| 10 | `proxy_upgradeable` | `cast storage <a> 0x360894…bbc` (EIP-1967 impl slot) | impl set, no timelock gov → **warn** | no |
| 10b | `market_flow_integrity` † | `cast logs` scan: round-trip volume, same-block in/out, thin-book spikes | coordinated round-trip or spoofing pattern → **warn**; stacked with denylist hit → **risk** | no (warn; stacked yes) |

**† #10b Market-flow integrity**: scan recent `Transfer` logs for the target token or wallet. Signals: (a) same counterparty both sides within short window, (b) volume spike with &lt;3 unique holders, (c) price-insensitive round lots. Evidence `source` same as #6/#7. Does not replace licensed market-surveillance — conservative **warn** only unless stacked with sanctions/denylist.

**† History-bound checks (honest boundary)**: pure RPC gives current nonce only, not full history. `account_age` and `counterparty_set` need explorer/indexer or bounded `cast logs`. If unavailable on Pharos, evidence must set `source: "cast_logs_scan" | "explorer" | "unavailable"` — **never pretend full chain verification**. Lookup failure → **warn**, not silent ok.

**‡ #8 default 📋**: if Pharos has no verified-source endpoint, treat as manual/off-chain attestation per `offchain-diligence.md`; evidence `verified_by: "manual"`.

**EIP-1967 slots** (#10):
- implementation: `0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`
- admin: `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`

Legacy checks retained: `denylist` local compare (also in sanctions layer as `sanctions_screen`).

---

## Evidence examples

```json
{
  "check": "code_size",
  "cmd": "cast codesize 0xabc… --rpc-url $RPC",
  "result": "0",
  "infer": "Contract self-destructed (codesize=0); code no longer accountable.",
  "flag": "risk"
}
```

```json
{
  "check": "counterparty_set",
  "cmd": "cast logs --from-block X --to-block latest … --rpc-url $RPC",
  "source": "cast_logs_scan",
  "result": { "counterparties": 3, "denylist_hits": 1 },
  "infer": "Historical counterparty hit denylist.",
  "flag": "risk"
}
```

```json
{
  "check": "account_age",
  "cmd": "cast logs (first tx lookup) --rpc-url $RPC",
  "source": "unavailable",
  "result": null,
  "infer": "No indexer; first-tx age unknown — conservative warn.",
  "flag": "warn"
}
```

```json
{
  "check": "privileged_powers",
  "cmd": "cast call 0xabc… \"owner()(address)\" --rpc-url $RPC",
  "result": { "owner": "0xEOA…", "timelock": false, "mint_unbounded": true },
  "infer": "Single EOA owner + unbounded mint + no timelock — stacked centralization risk.",
  "flag": "risk"
}
```

---

## Rating (pure function — unchanged)

Input = **all** evidence (sanctions + onchain + offchain):

```
any(flag == risk)           → 🔴 RED,   passed=false
no risk & warn_count >= 2   → 🟡 YELLOW, passed=true (+ human review)
no risk & warn_count <= 1   → 🟢 GREEN,  passed=true
```

On-chain checks that can produce **risk**: `#3 self-destruct`, `#7 denylist counterparty`, `#9 privileged_powers (stacked)` — plus sanctions layer #1/#11.

---

## User-facing output

```
[onchain-diligence] target=0xabc… role=issuer_self
  ├─ is_contract       : bytecode present              → warn
  ├─ code_size         : 14820 bytes                   → ok
  ├─ balance           : 2.1 PHRS                      → ok
  ├─ tx_count          : 318                           → ok
  ├─ account_age       : first tx 410d ago             → ok
  ├─ counterparty_set  : 42 cp, 0 denylist hits        → ok
  ├─ contract_verified : verified_by=manual (📋)       → ok
  ├─ privileged_powers : multisig owner, timelock on   → ok
  └─ proxy_upgradeable : impl set, timelock gov        → warn
→ risk=0, warn=2 → 🟡 YELLOW, passed=true — review proxy upgrade path
```

---

## Related

- Sanctions (#1/#11): `sanctions-screening.md`
- Off-chain: `offchain-diligence.md`
- Infer citations: `compliance-knowledge.md`
- Integration: `docs/diligence/INTEGRATION.md`
