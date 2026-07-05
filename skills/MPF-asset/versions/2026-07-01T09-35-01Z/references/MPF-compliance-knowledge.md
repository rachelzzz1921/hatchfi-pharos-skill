# MPF-bound reference

> Asset: `Manhattan Property Fund` (`MPF`)
> Token: `0xfef7519bebda6c47af49583dbc9e60801f8aa3de`
> This file was generated from `references/compliance-knowledge.md`.

# Reference: Compliance knowledge base (compliance-knowledge)

> **Capability**: Static frameworks for `evidence.infer` citations and spawn rule templates — **not** an execution layer.
> **Risk tier**: 🟢 (read-only reference).
> **Layer tag**: 📚 Knowledge mapping.

---

## When to trigger

- After evidence generation — run `erc3643_conformance` mapping (#16).
- When spawning asset sub-skills that need ERC-3643-style rule templates.

---

## ERC-3643 / T-REX alignment

### Two gates = on-chain mirror of pre-issuance diligence

Before every transfer, token logic requires:

1. `IdentityRegistry.isVerified(addr)` — identity / admission
2. `Compliance.canTransfer(from, to, amount)` — business rules

**Mapping**: HatchFi pre-issuance **RED gate** is the **upstream mirror** of these two post-issuance checks. Diligence blocks bad onboarding; T-REX enforces on every transfer. Complementary — HatchFi uses a **single-contract subset** (see `DECISIONS.md`), not full six-contract T-REX.

### Six core contracts + agent role

| Contract | Role |
|---|---|
| Token (IToken) | ERC-20 + compliance hooks |
| IdentityRegistry | wallet ↔ verified identity |
| IdentityRegistryStorage | identity data (upgradeable split) |
| ModularCompliance | transfer rules |
| TrustedIssuersRegistry | authorized claim issuers |
| ClaimTopicsRegistry | required claim types |

Privileged actions via `IAgentRole` + ERC-173: mint / burn / **forcedTransfer** / recovery.

**Hard gate alignment**: RED refuses `mint` / `registerIdentity` / `forcedTransfer` — the same agent-privileged surface in T-REX.

### Tailor-made vs modular (spawn guidance)

| | Tailor-made | Modular + modules |
|---|---|---|
| Transparency | logic in one place | rules in plug-in modules |
| Rule changes | redeploy / patch contract | add/remove modules |
| Best for | stable simple rules | multi-jurisdiction, reusable issuance |

**Spawn recommendation**: asset-specific caps/jurisdictions/lockups → **modular** pattern in sub-skill rules even when parent token is monolithic today. Each spawn emits `COMPLIANCE_MODULE.md` — see below.

### Transferability models (pick at diligence — binds spawn)

| Model | `wrapper_type` | On-chain transfer | KYC / admission gate | Composability |
|---|---|---|---|---|
| Closed custody | `closed_custodial` | None (custody-bound) | Platform / custodian | None |
| **Permissioned token** | `permissioned_token` | `isVerified` + `canTransfer` only | On-chain registry + off-chain Tier B | High — DeFi with guardrails |
| Derivative reference | `derivative_reference` | None or synthetic ledger | Contract / app layer | Low |
| Free transfer + legal gate | `freely_transferable` | ERC-20 open | Mint / redeem only | Highest — relies on off-chain law |

**HatchFi default**: `permissioned_token` — composable yet enforceable on every transfer.

**Hard rule**: if diligence declares `closed_custodial` or `derivative_reference` but deployed token exposes open `transfer()` without freeze → `legal_wrapper_profile` **risk** (wrapper / chain mismatch).

### Regime binding (declared `target_regime` → on-chain knobs)

After `legal_wrapper_profile` passes, map `target_regime` to concrete `CompliantRWAToken` + spawn module fields:

| `target_regime` | Typical caps | Jurisdiction handling | Notes |
|---|---|---|---|
| `mica_eu` | conservative `max_holders` | `allowed_jurisdictions` EEA subset | CASP alignment off-chain |
| `reg_d_us` | accredited investor caps | US persons rules in off-chain Tier A/B | Reg D disclosure in wrapper doc |
| `reg_s_us` | offshore distribution | non-US `distribution_eligibility` | no US persons in allowed list |
| `private_placement` | low holder count | issuer-defined `allowed_jurisdictions` | default for testnet demos |
| `sandbox` | experimental limits | explicit waiver doc | warn if waiver missing |

Persist binding in `state.asset.compliance_module.regime_bindings` — spawn copies desensitized summary only.

### Modular Compliance Module (spawn artifact)

On `npm run spawn:asset`, write `COMPLIANCE_MODULE.md` beside `PERMISSIONS.md`:

```
wrapper_type · target_regime · transferability · kyc_placement
regime_bindings → isVerified / canTransfer / maxHolders / maxBalance / freeze policy
diligence_checks_run (ids only) · rating — NO background PII
```

Child skill agents read this module before mint / whitelist — modular rules per asset, not a monolithic parent policy.

### Known attack surfaces (risk notes)

- Compromised trusted issuer → forged eligibility claims.
- Undocumented upgrade path → governance liability (maps to onchain `#10 proxy_upgradeable`).

Sources: [EIP-3643](https://eips.ethereum.org/EIPS/eip-3643) · [ERC-3643 docs](https://docs.erc3643.org) · [Tokeny overview](https://tokeny.com/erc3643/)

---

## RWA red flags (infer citation table)

| Red flag | Severity | check id |
|---|---|---|
| No legal wrapper for holder rights | **risk** | `legal_wrapper_profile` (#14) |
| Wrapper type contradicts on-chain transfer model | **risk** | `legal_wrapper_profile` (#14) |
| No documented right to tokenize underlying asset | **risk** | `tokenization_rights` (#17) |
| Subscriber outside declared distribution geography | **risk** | `distribution_eligibility` (#18) |
| Claimed license not in public regulator DB | **risk** | `issuer_background` (#12) |
| Self-reported reserves, no independent oracle | warn | `custodian_attestation` (#13) |
| No smart-contract audit or &gt; 12 months | warn | `audit_recency` (#15) |
| Unclear geographic restrictions | warn | `legal_wrapper_profile` / ClaimTopics |
| Thin-liquidity flow anomaly (round-trip / wash pattern) | warn | `market_flow_integrity` (#10b) |
| Duplicate tokenization (same asset fingerprint, other token) | **risk** | `duplicate_tokenization` (#19) |
| No declared liquidity / exit path | warn | `liquidity_exit_path` (#20) |
| Opaque mint/burn vs reserves | warn→**risk** (stacked) | `privileged_powers` (#9) + PoR |
| Unverified / obfuscated source | warn | `contract_verified` (#8) |
| Sanctioned address | **risk** | `sanctions_screen` (#1) |
| Self-destructed contract | **risk** | `code_size` (#3) |

Structured JSON: `assets/knowledge/rwa_red_flags.json`

Consensus: legitimate projects use multisig / timelock / renounced ownership; opacity is a signal. Missing independent audit is an institutional diligence flag.

Sources: [MetaMask RWA verification](https://metamask.io/news/how-to-verify-rwa-tokens) · [InvestaX checklist](https://investax.io/blog/legal-compliance-checklist-for-the-tokenization-of-real-world-assets-rwas)

---

## Conformance check (#16)

| check | cmd | flag rules |
|---|---|---|
| `erc3643_conformance` | `knowledge_mapping: CompliantRWAToken vs T-REX checklist` | missing `canTransfer`-equivalent → **warn**; missing `isVerified` → **warn**; known breached trusted issuer → **risk** |

Evidence example:

```json
{
  "check": "erc3643_conformance",
  "cmd": "knowledge_mapping: CompliantRWAToken surface vs T-REX",
  "result": {
    "has_identity_check": true,
    "has_transfer_rule_check": true,
    "forced_transfer_gated": true
  },
  "infer": "HatchFi token implements isVerified + canTransfer + agent-gated forcedTransfer.",
  "flag": "ok"
}
```

This layer mostly produces **warn**; escalate to **risk** only when mapping hits known compromised issuer or sanctions overlap.

---

## User-facing output

```
[compliance-knowledge] asset=MPF issuance config
  ├─ identity check (isVerified)     : present  → ok
  ├─ transfer rule (canTransfer)     : present  → ok
  ├─ forcedTransfer AgentRole gated  : yes      → ok
  └─ red flag scan                   : legal wrapper present, audit 5mo → ok
→ warn=0 — spawn sub-skill may inherit modular rule template
```

---

## Regulatory framing (not legal advice)

Institution-grade RWA posture: compliance-first admission, explainable evidence, local data sovereignty. Does **not** replace licensed compliance officers.

---

## Paper alignment & deliberate omissions

**Reference**: Borjigin, Zhou, He (2025) — *AI-Governed Agent Architecture for Web-Trustworthy Tokenization of Alternative Assets* · [arXiv:2507.00096](https://arxiv.org/abs/2507.00096)

Qualitative concept architecture + real-estate case study. Implementation pilot listed as future work.

### What HatchFi adopts

| Paper mechanism | HatchFi implementation |
|---|---|
| Multi-agent orchestration of tokenization stages | Skill playbooks: sanctions → on-chain → off-chain → issuance → spawn |
| Separation of duties + approvals before mint | Deterministic RED gate; verification/compliance signals must pass before agent mint |
| On-chain approval / audit record | `onchain-attestation.md` — `DiligenceAttestationRegistry` stores evidence hash |
| Duplicate asset tokenization check | `#19 duplicate_tokenization` + `AssetTokenizationRegistry` |
| Post-issuance monitoring | `#10b market_flow_integrity` (read-only); full Monitoring Agent = roadmap |
| Progressive human sign-off | YELLOW → human review; 🔴 high-risk ops need confirm card |

### What HatchFi deliberately does NOT adopt (and why)

| Paper mechanism | HatchFi choice | Rationale |
|---|---|---|
| AI Governance Agent (adaptive policy, anomaly-driven freeze) | **Deterministic pure-function rating** | Explainable, reproducible; avoids AI false-positive freeze / false-negative fraud |
| Valuation Agent (authoritative AI pricing) | **No valuation output** | Model risk + liability; use valuation **divergence** as diligence signal only |
| ABT staking / slash cryptoeconomics | **Roadmap narrative only** (EIP-8004 reputation via `evidence{}`) | Hackathon lacks calibration data; paper notes tuning difficulty |
| Oracle-verified land registry on testnet | **`verified_by: manual`** honest boundary | Pharos Atlantic cannot assert global asset provenance |

### Phase 2: contract-enforced mint gate (design sketch — not deployed)

```solidity
interface IDiligenceAttestation {
    function isPassable(bytes32 evidenceHash) external view returns (bool);
}

// CompliantRWAToken.mint — future
function mint(address to, uint256 amount, bytes32 evidenceHash) external onlyAgent {
    if (!attestationRegistry.isPassable(evidenceHash)) revert DiligenceNotAttested();
    _mint(to, amount);
}
```

Phase 1: agent refuses RED + recommends attestation; contract does not yet enforce.

**Pitch line**: HatchFi is a **deterministic, deployed** instance of the agent-orchestrated tokenization research direction — replacing the paper's AI governance black box with reproducible gates and replacing conceptual on-chain approval records with Atlantic testnet attestations.
