# MPF-bound reference

> Asset: `Manhattan Property Fund` (`MPF`)
> Token: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
> This file was generated from `references/rwa-dividend.md`.

# Reference: RWA yield distribution (rwa-dividend)

> Contract source of truth: `assets/rwa/CompliantRWAToken.sol`. `$RPC=https://atlantic.dplabs-internal.com`, `$PK=$PRIVATE_KEY`.
> Dividend model: cumulative per-share `dividendPerShareCumulative` (1e18 precision) + per-address last-claimed cursor — **no holder iteration**, gas-safe; deposit/claim in native PHRS.

---

## Distribute yield 🔴 (issuer deposits dividend pool)

Pre: `state.asset.address` set; `totalSupply > 0`.
Confirmation card must state: deposit amount, per-share allocation at current supply, **irreversible**.

```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "depositDividend()" --value <PHRS_amount> --rpc-url $RPC --private-key $PK
```
Assert: `cast receipt <txhash>` with `status==1` → write `state.dividends[]{amount,tx,at}` + `history{action:"depositDividend",risk:"high",confirmed_by_human:true,tx,at}`.

> Mechanism: on deposit `dividendPerShareCumulative += value*1e18/totalSupply`. Holders earn pro-rata; transfers auto-settle via `_settleDividend`.

---

## Query claimable yield 🟢 (read-only, incl. unsettled)

```bash
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "dividendOf(address)(uint256)" <holder> --rpc-url $RPC
```
Return = settled `withdrawableDividend` + unsettled (balance × cumulative per-share delta). Display directly — no tx.

---

## Claim yield 🟢 (holder self-claim)

```bash
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "claimDividend()" --rpc-url $RPC --private-key $PK
```
Contract settles then transfers PHRS; reverts `nothing to claim` if zero. 🟢 tier: caller moves own funds, predictable, no third-party impact.
Optional history after assert (user's own action).

---

## Sweep dividend rounding dust 🔴 (owner only)

Per-share integer division leaves remainder (dust) in `undistributedDividend`; owner can sweep to avoid locked PHRS.

```bash
# Query dust (read-only)
cast call 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "undistributedDividend()(uint256)" --rpc-url $RPC
# Sweep to address (owner, 🔴 confirmation card)
cast send 0xfef7519bebda6c47af49583dbc9e60801f8aa3de "sweepUndistributedDividend(address)" <to> --rpc-url $RPC --private-key $PK
```
After `status==1` → `history{action:"sweepUndistributedDividend",risk:"high",confirmed_by_human:true,tx,at}`; optional `cast logs ... "DividendDustSwept(address,uint256)"`.

> `depositDividend` requires `perShare>0` (deposit large enough vs supply) or reverts `deposit too small for supply`.
> `recoveryAddress` migrates **settled unclaimed** dividends to the new wallet — lost key does not forfeit yield.

---

## Error handling

| revert | Meaning | Agent response |
|---|---|---|
| `no supply` | totalSupply is 0 | Suggest mint shares first |
| `no value` | No PHRS attached | Remind `--value` required |
| `deposit too small for supply` | Deposit too small vs supply | Increase deposit or reduce supply |
| `nothing to claim` | No claimable dividend | Balance is 0 |
| `nothing to sweep` | No dust to sweep | `undistributedDividend` is 0 |
| `transfer failed` / `sweep failed` | PHRS transfer failed | Check contract PHRS balance / recipient |
