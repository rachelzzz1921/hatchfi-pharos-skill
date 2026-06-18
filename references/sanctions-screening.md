# Reference: Sanctions & denylist screening (sanctions-screening)

> **Capability**: Layer **#1 / #11** in diligence numbering — deterministic sanctions screening before other on-chain checks.
> **Risk tier**: 🟢 Low (read-only set membership + optional `cast call` oracle).
> **Roles**: all (`issuer_self`, `custodian`, `intermediary`, `investor`, `large_subscriber`).
> **Principle**: hit = hard red line; stale list = process **warn**. Zero paid API.

---

## When to trigger

- Any `target_address` enters diligence Stage 2 (run **before** `onchain-diligence` checks #2–#10).
- Before spawn writes asset-specific rules — final screen on issuer-related addresses.

On **RED** from this layer: stop further checks; refuse `mint` / `registerIdentity` / `forcedTransfer`.

---

## Denylist data sources (no paid API)

| Source | Content | Integration |
|---|---|---|
| [0xB10C/ofac-sanctioned-digital-currency-addresses](https://github.com/0xB10C/ofac-sanctioned-digital-currency-addresses) | OFAC SDN ETH addresses, nightly JSON | Merge into `state.config.denylist[]`; record snapshot date |
| Issuer custom denylist | Project block list | Same array |
| Mock OFAC Oracle (testnet) | `assets/rwa/MockOFACRegistry.sol` | Optional `cast call isSanctioned(address)` — see below |
| OFAC Sanctions List Search (manual) | Address hash in ID# field | **Human review only** — not in auto flow |

### Refresh snapshot (offline)

```bash
# From repo root — see scripts/refresh_ofac_denylist.sh
curl -sL https://raw.githubusercontent.com/0xB10C/ofac-sanctioned-digital-currency-addresses/lists/sanctioned_addresses_ETH.json \
  -o assets/knowledge/denylist_ofac_eth.json
date -u +%Y-%m-%d > assets/knowledge/denylist_ofac_eth.snapshot
```

Merge addresses into `state.config.denylist[]` and set `state.diligence.list_snapshots.ofac_eth`.

> **List mutability**: sanctions lists add **and** remove entries (e.g. Tornado Cash added 2022-08-08, removed 2025-03-21). Stale snapshots break reproducibility — always record `list_snapshot` in evidence.

---

## Comparison algorithm (deterministic)

```
normalize(addr) = lowercase(addr)     # EIP-55 case-insensitive
matched = normalize(target) ∈ denylist_set   # exact membership, O(1) set
```

- **Exact match only** — no fuzzy/prefix (aligns with OFAC ID# lookup).
- Deduplicate denylist into a set before compare.

---

## Checks

| check | cmd | flag rules |
|---|---|---|
| `sanctions_screen` | `set-membership(target, state.config.denylist[])` | matched → **risk**; miss → ok |
| `ofac_sanctioned` | `cast call $ORACLE "isSanctioned(address)(bool)" <target> --rpc-url $RPC` | `true` → **risk**; `false` → ok; oracle unset → skip |
| `sanctions_list_stale` | `today - state.diligence.list_snapshots.ofac_eth` | age &gt; 30 days → **warn** |

Either `sanctions_screen` **or** `ofac_sanctioned` hit → **risk** (RED).

---

## Evidence examples

Miss (ok):

```json
{
  "check": "sanctions_screen",
  "cmd": "set-membership(target, denylist_ofac_eth)",
  "list_snapshot": "2026-06-18",
  "result": { "matched": false, "list_size": 612 },
  "infer": "Target not in 2026-06-18 OFAC ETH snapshot.",
  "flag": "ok"
}
```

Hit (RED):

```json
{
  "check": "sanctions_screen",
  "cmd": "set-membership(target, denylist_ofac_eth)",
  "list_snapshot": "2026-06-18",
  "result": { "matched": true, "program": "CYBER2" },
  "infer": "Target matches OFAC SDN sanctioned address.",
  "flag": "risk"
}
```

Stale list (warn):

```json
{
  "check": "sanctions_list_stale",
  "cmd": "compare today to list_snapshots.ofac_eth",
  "result": { "age_days": 47, "snapshot": "2026-05-02" },
  "infer": "Local OFAC snapshot >30 days old; may miss newly listed addresses.",
  "flag": "warn"
}
```

---

## Rating

- `sanctions_screen` or `ofac_sanctioned` → **risk** → 🔴 RED → `passed=false`.
- `sanctions_list_stale` → **warn** (counts toward YELLOW when ≥2 warns total).

This layer is the most common **risk** producer for wallet targets.

---

## User-facing output

Clean pass:

```
[sanctions-screening] target=0xabc… role=large_subscriber
  ├─ list_snapshot: 2026-06-18 (age 0d)
  ├─ sanctions_screen: matched=false (list_size=612)
  └─ flag: ok
→ proceed to onchain-diligence #2–#10
```

Hit:

```
[sanctions-screening] target=0xdef… role=investor
  ├─ sanctions_screen: matched=TRUE (program=RUSSIA-EO14024)
  └─ flag: RISK
→ 🔴 RED — refuse registerIdentity; stop pipeline
```

---

## Data sovereignty

- Denylist + `list_snapshots` are public facts → **no deposit consent**; spawn may inherit snapshot date + check ids.
- Sanction program details tied to individuals → private `background` if stored; not in spawn package.

Mock oracle: `state.config.ofac_oracle` · sample addresses: `assets/knowledge/sanctions_sample.json`
