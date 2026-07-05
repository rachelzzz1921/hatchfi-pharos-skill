# Paper Alignment · arXiv:2507.00096

> HatchFi positioning vs. Borjigin, Zhou, He (2025) — *AI-Governed Agent Architecture for Web-Trustworthy Tokenization of Alternative Assets*  
> Probe Group, Singapore · [arXiv:2507.00096](https://arxiv.org/abs/2507.00096) · [PDF](https://arxiv.org/pdf/2507.00096)

---

## 论文是什么（What the paper proposes）

The paper argues that **web-trustworthy** alternative-asset tokenization requires bridging on-chain guarantees with off-chain trust (asset verification, compliance, lifecycle). Its architecture has four layers:

| Layer | Role |
|---|---|
| Blockchain | Immutable ledger + asset token smart contracts |
| Agent | Verification, Valuation, Compliance, Tokenization, Monitoring agents |
| **AI Governance** | Oversees agents; adaptive policy; can freeze tokens / slash stakes via governance contract |
| UI | Asset owners and investors interact through dashboards |

Key workflow: Verification + Valuation + Compliance must all approve **before** Tokenization Agent mints. Approvals are recorded on-chain in preliminary contract state. Post-issuance, Monitoring Agent flags anomalies; AI Governance can pause trading.

**Paper status**: qualitative evaluation + real-estate case study. Full pilot implementation = **future work**.

---

## HatchFi 映射（Mapping）

| Paper | HatchFi (Round 8) | Notes |
|---|---|---|
| Verification Agent | `onchain-diligence` + `offchain-diligence` + `sanctions-screening` | Deterministic checks, not ML |
| Compliance Agent | ERC-3643 `isVerified` + `canTransfer` + off-chain KYC fields | Strong alignment |
| Tokenization Agent | `rwa-issuance` mint flow (agent-gated) | Strong alignment |
| On-chain approval record | `DiligenceAttestationRegistry` + `onchain-attestation.md` | **Round 8** — evidence hash on Atlantic |
| Duplicate tokenization check | `#19 duplicate_tokenization` + `AssetTokenizationRegistry` | **Round 8** |
| Monitoring Agent | `#10b market_flow_integrity` | Read-only warn; full agent = roadmap |
| AI Governance Agent | **Not implemented — deliberate** | Replaced by pure-function `rating = f(flags)` |
| Valuation Agent | **Not implemented — deliberate** | Use divergence as diligence signal only |
| ABT staking / slash | **Roadmap narrative** (EIP-8004-style reputation via `evidence{}`) | No cryptoeconomics on testnet |

---

## 我们更强的地方（Differentiation for judges）

1. **Deterministic gates** — same evidence → same RED/YELLOW/GREEN; no AI black-box freeze risk the paper itself worries about.
2. **Deployed on Atlantic** — MPF token + Mock OFAC oracle + (optional) attestation registries; paper is qualitative-only.
3. **Agent-orchestrated + Skill spawn** — paper has agents; HatchFi adds **private operating Skills** per asset (no equivalent in paper).
4. **Honest testnet boundaries** — chain-off asset facts use `verified_by: manual`; we do not pretend global land-registry oracles.

---

## 我们刻意不做（Deliberate omissions）

| Paper mechanism | Why HatchFi skips it |
|---|---|
| AI Governance loop (Algorithm 1) | False positives freeze legitimate trades; false negatives miss fraud — replaced by reproducible rules |
| Authoritative AI valuation | Model risk + liability; paper uses valuation **divergence** to trigger review — we mirror that as a signal, not an output |
| ABT stake slashing | Needs calibration data; paper notes tuning difficulty |
| Claiming full decentralization | Single skill operator today; multi-institution agents = future |

---

## Phase 2 roadmap（not in Round 8）

```solidity
// CompliantRWAToken.mint — future contract-enforced gate
function mint(address to, uint256 amount, bytes32 evidenceHash) external onlyAgent {
    if (!attestationRegistry.isPassable(evidenceHash)) revert DiligenceNotAttested();
    _mint(to, amount);
}
```

Phase 1: agent refuses RED + recommends attestation; mint does **not** yet require on-chain proof.

---

## 答辩一句话 / Pitch line

**EN**: We cite Borjigin et al. (2025) to show agent-orchestrated tokenization is a serious research direction. HatchFi is a **deterministic, deployed** instance of that blueprint — replacing the paper's AI governance black box with reproducible gates, and replacing conceptual on-chain approval records with Atlantic testnet diligence attestations.

**中文**: 引用 Borjigin 等 (2025) 说明「Agent 编排代币化」是被认真研究的方向；HatchFi 是该蓝图的**确定性、已落地**实例——用可复现的纯函数 RED 闸门替代论文担心的 AI 治理黑箱，用链上 diligence 哈希存证替代其停留在概念的批准记录。

---

## 竞品定位（one glance）

| | Platform compliance (Tokeny, Securitize) | AI + RWA discovery only | **HatchFi** |
|---|---|---|---|
| Agent orchestration | No | Partial (scoring/routing) | **Full pipeline** |
| ERC-3643 issuance | Yes | No | Yes (riding standard) |
| Deterministic diligence agent | No | Partial | **Yes** |
| Skill self-spawn | No | No | **Yes** |

HatchFi does not compete on licenses or AUM — it occupies the **agent + spawn** layer incumbents have not productized.

| Post-issuance monitoring | `#10b` + `post-issuance-monitoring.md` | Read-only; no AI auto-freeze |

---

## Round 10 — cross-language golden parity

| layer | check |
|---|---|
| Python | `eval/evidence_hash_golden.json` via `npm run eval:skill` |
| Solidity | `test_EvidenceHashGoldenFixture` · `test_AssetFingerprintGoldenMpf` in `DiligenceAttestation.t.sol` |
| Agent CLI | `npm run evidence:summary` · `npm run attest:dry-run` (calldata, no key) |

```bash
npm run evidence:summary
npm run attest:dry-run
forge test --match-contract DiligenceAttestation
```

---

## Round 9 tooling

```bash
npm run evidence:hash -- --state state.json
npm run deploy:attestation    # then
npm run smoke:attestation     # attest + register MPF fingerprint
```

---

## 落地文件（Round 8）

- `references/onchain-attestation.md`
- `references/offchain-diligence.md` (#19, #20)
- `references/compliance-knowledge.md` (Paper alignment §)
- `assets/rwa/DiligenceAttestationRegistry.sol`
- `assets/rwa/AssetTokenizationRegistry.sol`
- `deployments/attestation_atlantic.json`
