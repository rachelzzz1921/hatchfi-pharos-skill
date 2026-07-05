# 尽调 / 合规审查增强 · 整合档案

> 归档前几轮外部审查草稿与 HatchFi Skill 适配说明。  
> 原始外部草稿已清理出提交包；本文件仅保留最终采用的设计差异和落地位置。

---

## 1. 迭代来源与状态

| 迭代 | 内容 | 整合状态 |
|---|---|---|
| Research round 1 | 行业调研、扩展 checklist、三阶段 workflow | ✅ 已适配 |
| Research round 2 | Mock Oracle、Python Orchestrator、System Prompt | ⚠️ 部分采纳 |
| **Round 8 (paper-driven)** | arXiv:2507.00096 对齐 · #19/#20 · 链上存证 registry · onchain-attestation playbook | ✅ **已落地** |

---

## 2. 核心增量（相对早期迭代版）

| 主题 | 最终增量 | 落地位置 |
|---|---|---|
| 链上 5→11 项 | `account_age`, `counterparty_set`, `contract_verified`, `privileged_powers`, `proxy_upgradeable` | `onchain-diligence.md` |
| 链下 ISS/CUS/INT | `issuer_background`, `legal_wrapper_profile`, `tokenization_rights`, `audit_recency`, `custodian_attestation`, `distribution_eligibility` | `offchain-diligence.md` |
| **#19 / #20** | `duplicate_tokenization`, `liquidity_exit_path` | `offchain-diligence.md` |
| **链上存证** | `DiligenceAttestationRegistry` + `AssetTokenizationRegistry` | `assets/rwa/*.sol` · `onchain-attestation.md` |
| 制裁层 #1/#11 | `sanctions_screen` + `sanctions_list_stale` + 0xB10C OFAC JSON | `sanctions-screening.md` + `scripts/refresh_ofac_denylist.sh` |
| 合规知识 #16 | `erc3643_conformance` + 六合约对照 + modular spawn 建议 | `compliance-knowledge.md` |
| 角色码 | ISS/CUS/INT/INV/SUB | 映射为 HatchFi `target_role` enum |
| consent 拒绝 | 跳过链下检查，不自动 RED | `offchain-diligence.md` |
| 历史检查诚实边界 | indexer 不可用 → warn(`unavailable`) | `onchain-diligence.md` † 注 |

---

## 3. 早期迭代 vs 最终采用

| 主题 | 早期方案 | 强化方案 | **HatchFi 采用** |
|---|---|---|---|
| 链下 evidence | 必须有 `cmd` | 不要 `cmd`，用 `verified_by` | **`cmd` 保留**（链下写 `questionnaire:…`）+ **可选 `verified_by`** |
| consent=false | → risk | → skip 链下，仍可链上评级 | **skip 链下，仍可链上评级** |
| 制裁数据源 | Mock Oracle only | 0xB10C GitHub + 快照时效 | **两者并存** |
| 链上项数 | 5–7 | 11 编号 | **11 项** |
| Python Orchestrator | 提议 | 无 | **拒绝** |
| `diligence_session` | 提议 | 无 | **拒绝** — 扩展现有 `diligence` |

---

## 4. 角色 → 检查子集（HatchFi enum）

| target_role | Alias | 必跑（摘要） |
|---|---|---|
| `issuer_self` | ISS | distribution_eligibility + sanctions + onchain #2–10,#10b + issuer_background, legal_wrapper_profile, tokenization_rights, audit_recency, **duplicate_tokenization (#19)**, **liquidity_exit_path (#20)** |
| `custodian` | CUS | distribution_eligibility + sanctions + onchain + custodian_attestation, audit_recency |
| `intermediary` | INT | distribution_eligibility + sanctions + issuer_background, legal_wrapper_profile, tokenization_rights（若承担发行） |
| `investor` | INV | distribution_eligibility + sanctions + onchain + kyc_expiry, jurisdiction_match |
| `large_subscriber` | SUB | INV 全集 + large_fiat_source（Tier A KYC） |
| `underlying_asset` | — | asset_lien_status, tokenization_rights, legal_wrapper_profile, jurisdiction_match, **duplicate_tokenization (#19)**, **liquidity_exit_path (#20)** |

完整规则见各 reference 检查表。

---

## 5. 落地文件清单

| 路径 | 职责 |
|---|---|
| `references/onchain-diligence.md` | #2–#10 链上 cast |
| `references/offchain-diligence.md` | Stage 0 链下 + ISS/CUS/INT |
| `references/sanctions-screening.md` | #1/#11 制裁 |
| `references/compliance-knowledge.md` | ERC-3643 + red flags + #16 + paper alignment |
| `references/onchain-attestation.md` | 尽调结论哈希上链 + asset 注册 |
| `assets/knowledge/rwa_red_flags.json` | 编号 red flags v3 |
| `scripts/refresh_ofac_denylist.sh` | OFAC ETH 快照刷新 |
| `assets/rwa/MockOFACRegistry.sol` | testnet oracle（保留） |
| `assets/rwa/DiligenceAttestationRegistry.sol` | 尽调存证 |
| `assets/rwa/AssetTokenizationRegistry.sol` | 重复代币化登记 |

---

## 6. 检查编号总表（答辩用）

| # | check | 层 | risk? |
|---|---|---|---|
| 1 | sanctions_screen | sanctions | yes |
| 2–5 | is_contract, code_size, balance, tx_count | onchain | #3 yes |
| 5b | wallet_maturity | onchain | no |
| 6–10 | account_age … proxy_upgradeable | onchain | #7, #9 yes |
| 10b | market_flow_integrity | onchain | no (warn; stacked) |
| 11 | ofac_sanctioned (oracle) | sanctions | yes |
| 12–15 | issuer_background … audit_recency | offchain | #12, #14 yes |
| 17 | tokenization_rights | offchain | yes |
| 18 | distribution_eligibility | offchain | yes |
| 19 | duplicate_tokenization | offchain | yes |
| 20 | liquidity_exit_path | offchain | no |
| 16 | erc3643_conformance | knowledge | rare yes |
| — | onchain_attestation | attestation | no (medium-risk write) |

评级纯函数不变：`any risk → RED` · `≥2 warn → YELLOW` · `≤1 warn → GREEN`.

---

## 7. Round 8 changelog (paper-driven)

1. arXiv:2507.00096 alignment documented in `compliance-knowledge.md` · `docs/PAPER_ALIGNMENT.md`
2. Checks #19 `duplicate_tokenization` · #20 `liquidity_exit_path`
3. `DiligenceAttestationRegistry` + `AssetTokenizationRegistry` + `onchain-attestation.md`
4. Phase 2 mint gate = design sketch only (agent-enforced in Phase 1)

---

## 8. 下一步

1. ~~`npm run diligence:sync`~~ ✅ 已跑（93 地址 · 快照 2026-06-18）
2. ~~`npm run spawn:asset`~~ ✅ MPF-asset v5 · 4 份 diligence reference
3. ~~`npm run deploy:mock-ofac`~~ ✅ Oracle `0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400`
4. Demo RED：对 `0x7F367cC41522cE07553e823bf3be79A889DEbe1B` 跑 `cast call isSanctioned` → true

---

## 附录：早期整合说明（历史）

见 git 历史 / DECISIONS.md 第六轮。Python Orchestrator 与独立 System Prompt 未采纳；Skill-native playbooks 为唯一编排面。
