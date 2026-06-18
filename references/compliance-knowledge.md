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

**Spawn recommendation**: asset-specific caps/jurisdictions/lockups → **modular** pattern in sub-skill rules even when parent token is monolithic today.

### Known attack surfaces (risk notes)

- Compromised trusted issuer → forged eligibility claims.
- Undocumented upgrade path → governance liability (maps to onchain `#10 proxy_upgradeable`).

Sources: [EIP-3643](https://eips.ethereum.org/EIPS/eip-3643) · [ERC-3643 docs](https://docs.erc3643.org) · [Tokeny overview](https://tokeny.com/erc3643/)

---

## RWA red flags (infer citation table)

| Red flag | Severity | check id |
|---|---|---|
| No legal wrapper for holder rights | **risk** | `legal_wrapper` (#14) |
| Claimed license not in public regulator DB | **risk** | `issuer_background` (#12) |
| Self-reported reserves, no independent oracle | warn | `custodian_attestation` (#13) |
| No smart-contract audit or &gt; 12 months | warn | `audit_recency` (#15) |
| Unclear geographic restrictions | warn | `legal_wrapper` / ClaimTopics |
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
