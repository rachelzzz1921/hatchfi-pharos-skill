# offchain-diligence.md

> HatchFi 尽调 reference · 链下背景层
> 层级：📋 结构化字段（**不假装已链上验证**）｜ 适用角色：ISS / CUS / INT 为主
> 原则锚定：链下 risk（假牌照、无法律外壳）同样触发硬闸门；PII 字段需 deposit consent。

---

## 1 · trigger

在以下任一情况执行：
- `target_role ∈ {ISS, CUS, INT}`。
- 链上信号不足（如 target 是 EOA、无合约可读），需补背景才能评级。

**关键**：本层字段不来自 cast，evidence **必须**带 `verified_by`（`manual` / `document` / `regulator_db`），且**绝不写 `cmd`**。这是与链上层的硬性区分。

---

## 2 · 检查表（按角色的必填字段）

### 发行方 ISS
| # | check | 字段来源 | flag 规则 |
|---|---|---|---|
| 12 | issuer_background | 问卷：董事 / 控股股东 / 历史财报 / 许可证号 | 关键字段缺失→**warn**；声称持牌但无法在监管公开库独立核验→**risk** |
| 14 | legal_wrapper | 法律 prospectus、持有人权利、赎回条款 | 缺失法律外壳→**risk** |
| 15 | audit_recency | 智能合约审计报告日期 | 无审计或 > 12 个月→**warn** |

### 托管方 CUS
| # | check | 字段来源 | flag 规则 |
|---|---|---|---|
| 13 | custodian_attestation | 托管协议、保险凭证、Proof-of-Reserve 来源 | 无独立 PoR 或无保险→**warn**；自报储备而无独立预言机验证→**warn** |
| 15 | audit_recency | 同上 | 同上 |

### 中介 / 承销 / 服务商 INT
- 取 ISS 的 #12（背景 + 牌照核验）+ #14（法律外壳，若 INT 承担发行职责）。
- 牌照核验规则同 ISS：**独立到监管公开库查，不信对方自报网站**。

> RWA red flags 速查（判 flag 依据，详见 `compliance-knowledge.md`）：
> 自报储备无预言机验证 · 无审计或审计 > 12 月 · 持有人权利文件含糊 · 未披露地域限制 · mint/burn 不透明（代币凭空增发而储备不增）。

---

## 3 · evidence 示例

```json
{ "check": "legal_wrapper", "source": "questionnaire", "verified_by": "document", "result": { "prospectus": false }, "infer": "无法律外壳定义持有人权利，明确 red flag", "flag": "risk" }

{ "check": "issuer_background", "source": "questionnaire", "verified_by": "regulator_db", "result": { "license_claimed": "MAS-CMS-123", "license_verified": false }, "infer": "声称持牌但监管公开库查无此号", "flag": "risk" }

{ "check": "custodian_attestation", "source": "questionnaire", "verified_by": "manual", "result": { "por_source": null, "insurance": null }, "infer": "无独立 PoR、无保险凭证", "flag": "warn" }
```

---

## 4 · rating 衔接

链下 risk 与链上 risk **同权**，一并进同一纯函数：
- `issuer_background`(假牌照) / `legal_wrapper`(无外壳) 产 risk → 🔴 RED → 拒绝发行。
- 其余产 warn，组合达 🟡。

> 设计要点：硬闸门不区分 risk 来自链上还是链下。一个查无的牌照号和一个自毁合约，对评级的杀伤力相同。

---

## 5 · 输出样例

```
[offchain-diligence] target=0xISS… role=ISS  (consent=granted)
  ├─ issuer_background : license MAS-CMS-123 → regulator_db NOT FOUND → RISK
  ├─ legal_wrapper     : prospectus present                          → ok
  └─ audit_recency     : audited 5 months ago                        → ok
→ risk=1 → 🔴 RED, passed=false. agent 拒绝 mint。
```

consent 未授予时：
```
[offchain-diligence] target=0xISS… role=ISS  (consent=DENIED)
  └─ 全部 ISS 背景字段跳过，记入 skipped_checks(reason="consent_not_granted")
→ 本层不产 evidence。评级仅依链上层结果。
```

---

## 数据主权说明（关键）

- 本层字段几乎全是 **PII / 商业敏感**（董事、控股股东、KYC 引用、托管协议）→ 写入 `state.json` **私有段 `background`**，`_requires_consent: true`。
- `deposit_consent == false` 时：**不采集**，每个应跑的 check 记一条 `skipped_checks{reason:"consent_not_granted"}`，agent 仍可仅凭链上层出评级（不阻断「只读尽调自动跑」）。
- **spawn 子 skill 绝不打包 `background` 段**；可继承的只有去敏后的 `checks_run` 摘要与 `rating`。
- KYC 等原始 PII **只存引用/哈希**，不存明文（对齐 ERC-3643：ONCHAINID 不在链上存 PII，只存引用与哈希）。
