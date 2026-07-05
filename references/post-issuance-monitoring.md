# Reference: Post-issuance monitoring (post-issuance-monitoring)

> **Capability**: Read-only lifecycle surveillance after mint — paper Monitoring Agent analogue without AI black box.
> **Risk tier**: 🟢 Low (cast logs / RPC only; no writes unless human confirms freeze).
> **Pair with**: `onchain-diligence.md` § `#10b market_flow_integrity` · `compliance-knowledge.md`

---

## When to trigger

- After first `mint` or when user asks to **audit trading activity** / suspicious flow.
- Periodic health check on spawned asset Skill (Phase C in pipeline).
- Paper alignment: Borjigin et al. (2025) Monitoring Agent — HatchFi uses **deterministic signals**, not adaptive AI freeze.

---

## Checks (issuance后)

| # | check | source | flag rules |
|---|---|---|---|
| 10b | `market_flow_integrity` | `cast logs` on token: round-trip, same-block in/out, thin-book spikes | coordinated pattern → **warn**; stacked with denylist → **risk** |
| — | `holder_concentration` | `holderCount` + top balances via explorer or indexed logs | single holder &gt; 20% supply (if declared cap) → **warn** |
| — | `sanctions_rescreen` | re-run `sanctions-screening.md` on new counterparties from recent transfers | hit → **risk** |

Full `#10b` rules: `onchain-diligence.md`.

---

## Agent behavior

1. **Read-only by default** — monitoring does not auto-`setAddressFrozen` or pause.
2. On **warn**: surface in chat + append to `state.diligence.evidence[]` with `source: cast_logs_scan`.
3. On **risk** (e.g. sanctions hit on new holder): recommend `setAddressFrozen` 🟡 or human escalation — cite evidence.
4. **No AI governance loop** — do not infer fraud from ML; use fixed flag rules only.

---

## cast sketch (#10b)

```bash
TOKEN=<state.asset.address>
RPC=$PHAROS_RPC
# Recent Transfer events (ERC-20 Transfer signature)
cast logs --from-block <recent> --address $TOKEN \
  "Transfer(address,address,uint256)" --rpc-url $RPC
```

If indexer unavailable → evidence `flag: warn`, `source: unavailable` (same honesty boundary as `account_age`).

---

## User-facing output

```
[post-issuance-monitoring] token=MPF @ 0xfef7…
  ├─ market_flow_integrity : no round-trip pattern in last N blocks → ok
  ├─ holder_concentration : max 12% < 20% cap → ok
  └─ sanctions_rescreen   : 0 new hits → ok
→ no action required; continue lifecycle ops
```

---

## Paper vs HatchFi

| Paper Monitoring Agent | HatchFi |
|---|---|
| AI anomaly detection → governance freeze | Deterministic `#10b` + human confirm for freeze |
| Continuous adaptive policy | Fixed reference rules + evidence trail |

Phase 2 (optional): auto-pause only when **stacked** risk flags (sanctions + wash pattern) — still no ML governance.
