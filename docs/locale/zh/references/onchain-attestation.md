> 中文 locale · 与 `references/onchain-attestation.md` 同步维护。
> 命令与 JSON 保持英文以便 agent 直接执行；章节标题与表格说明为中文。

# Reference: 链上尽调存证（onchain-attestation）

> **Capability**: Record diligence **conclusion hash** on Pharos Atlantic after rating — verifiable audit trail without putting PII on-chain.
> **Risk tier**: 🟡 Medium (one write tx per issuance path; auto + `state.history` audit).
> **Contracts**: `DiligenceAttestationRegistry` · `AssetTokenizationRegistry` — see `deployments/attestation_atlantic.json`.
> **Pair with**: `offchain-diligence.md` · `onchain-diligence.md` · `rwa-issuance.md`

---

## When to trigger

- After Stage 2 rating: `state.diligence.passed == true` and `rating ∈ {GREEN, YELLOW}`.
- **Before** deploy / mint (insert between diligence gate and Flow 1 deploy in `rwa-issuance.md`).
- **Do not attest** when `rating == RED` — contract reverts `RedRatingNotAttestable`.

Phase 1: attestation is **recommended** for audit trail; `CompliantRWAToken.mint` does **not** yet require it (Phase 2 roadmap in `compliance-knowledge.md`).

---

## Registry addresses

Read from `deployments/attestation_atlantic.json` or `state.config`:

| key | contract |
|---|---|
| `attestation_registry` | `DiligenceAttestationRegistry` |
| `asset_registry` | `AssetTokenizationRegistry` |

```bash
# Example after Atlantic deploy (replace with live addresses)
ATTEST=0x...   # DiligenceAttestationRegistry
ASSETS=0x...   # AssetTokenizationRegistry
RPC=$PHAROS_RPC   # https://atlantic.dplabs-internal.com
PK=$PRIVATE_KEY
```

---

## Asset fingerprint (#19 input)

Canonical fingerprint for duplicate-tokenization checks:

```
asset_fingerprint = keccak256(abi.encode(asset_id, jurisdiction, wrapper_type))
```

| field | source |
|---|---|
| `asset_id` | `state.asset.symbol` or issuer-declared unique id (e.g. `MPF-001`) |
| `jurisdiction` | `state.diligence.background.jurisdiction` (ISO alpha-2) |
| `wrapper_type` | `state.diligence.background.wrapper_type` |

Write hex to `state.diligence.asset_fingerprint` before attest.

Off-chain helper (Foundry cast — same encoding as Solidity):

```bash
cast keccak "MPF-001" "US" "permissioned_token"
# Or ABI encode then hash:
cast keccak $(cast abi-encode "f(string,string,string)" "MPF-001" "US" "permissioned_token")
```

---

## Evidence hash (canonical JSON)

Hash the **evidence array only** — not full `state.diligence` (no PII from `background`).

**Canonicalization rules** (deterministic — same inputs → same hash):

1. Sort `evidence[]` by `check` ascending (string).
2. Each item: include only keys `check`, `cmd`, `flag`, `infer`, `result` (omit null/missing).
3. `result`: if object, sort keys alphabetically; stringify with compact JSON (no spaces).
4. UTF-8 encode the JSON array string; `evidence_hash = keccak256(bytes)`.

**Production path** — canonical JSON via CLI (recommended):

```bash
npm run evidence:hash -- --state state.json
npm run evidence:fingerprint -- --asset-id MPF --jurisdiction US --wrapper-type permissioned_token
```

Or write canonical JSON manually and hash:

```bash
python3 scripts/evidence_hash.py --evidence /tmp/evidence.json --print-canonical
cast keccak "$(python3 scripts/evidence_hash.py --evidence /tmp/evidence.json --print-canonical)"
```

Golden test vectors: `eval/evidence_hash_golden.json` (run via `npm run eval:skill`).

---

## Step 1: Duplicate check (#19) before attest

```bash
FP=<asset_fingerprint>
cast call $ASSETS "tokenForAsset(bytes32)(address)" $FP --rpc-url $RPC
```

| result | flag |
|---|---|
| `0x000…000` | ok — no prior registration in this registry |
| same as `state.asset.address` (re-attest path) | ok |
| different non-zero address | **risk** → `duplicate_tokenization` → RED, **do not mint** |

See `offchain-diligence.md` § `#19 duplicate_tokenization`.

---

## Step 2: Attest diligence conclusion

Rating enum (must match contract):

| HatchFi rating | `uint8` |
|---|---|
| RED | 0 — **do not call attest** |
| YELLOW | 1 |
| GREEN | 2 |

```bash
TARGET=<diligence.target>
HASH=<evidence_hash>
RATING=2   # GREEN — or 1 for YELLOW
FP=<asset_fingerprint>

cast send $ATTEST \
  "attest(bytes32,address,uint8,bytes32)" \
  $HASH $TARGET $RATING $FP \
  --rpc-url $RPC --private-key $PK
```

Post-tx assertion (required):

```bash
cast receipt <txhash> --rpc-url $RPC   # status must be 1
cast call $ATTEST "isPassable(bytes32)(bool)" $HASH --rpc-url $RPC
cast call $ATTEST "attestationByHash(bytes32)" $HASH --rpc-url $RPC
```

Write to `state.diligence.attestation`:

```json
{
  "registry": "0x...",
  "asset_registry": "0x...",
  "evidence_hash": "0x...",
  "tx": "0x...",
  "at": "2026-06-18T12:00:00Z",
  "rating_onchain": 2
}
```

Append `state.history` entry: `{ "action": "attest_diligence", "risk": "medium", "tx": "...", "at": "..." }`.

---

## Step 3: Register asset after deploy

After Flow 1 deploy captures `state.asset.address`:

```bash
TOKEN=<state.asset.address>
cast send $ASSETS "registerAsset(bytes32,address)" $FP $TOKEN \
  --rpc-url $RPC --private-key $PK
```

Idempotent if same `(fingerprint, token)` pair. Reverts `AssetAlreadyTokenized` if fingerprint maps to a **different** token.

---

## Honest boundaries

| claim | truth |
|---|---|
| On-chain hash proves diligence **conclusion** at attest time | yes — third parties verify hash ↔ evidence file |
| Hash contains PII | **no** — only evidence bundle; background stays in local `state.json` |
| Registry prevents global duplicate land titles | **no** — ecosystem-scoped; off-chain `verified_by:manual` when no registry |
| Mint blocked without attestation | **Phase 2 only** — agent enforces RED today; contract gate is roadmap |

---

## Phase 2 sketch (not implemented)

```solidity
// Future CompliantRWAToken.mint — design only
function mint(address to, uint256 amount, bytes32 evidenceHash) external onlyAgent {
    if (!attestationRegistry.isPassable(evidenceHash)) revert DiligenceNotAttested();
    _mint(to, amount);
}
```

---

## User-facing output

```
[onchain-attestation] target=0xISS… rating=GREEN passed=true
  ├─ evidence_hash : 0xabc…def (47 checks, canonical JSON)
  ├─ duplicate #19 : tokenForAsset=0x0 → ok
  ├─ attest tx     : 0x… (status=1)
  └─ isPassable    : true
→ state.diligence.attestation written — proceed to deploy
```

RED path:

```
[onchain-attestation] rating=RED → SKIP attest (contract would revert RedRatingNotAttestable)
→ refuse mint per hard gate
```

---

## Sources

- Paper alignment: Borjigin et al. (2025) arXiv:2507.00096 — on-chain approval record
- Contracts: `assets/rwa/DiligenceAttestationRegistry.sol` · `assets/rwa/AssetTokenizationRegistry.sol`
- Deploy: `script/DeployAttestation.s.sol`
