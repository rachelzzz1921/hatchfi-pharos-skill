# compliance-knowledge.md

> HatchFi 尽调 reference · 合规知识对照层
> 层级：📚 知识对照（为 evidence 的 `infer` 字段提供「为何此 flag」的依据；为 spawn 子 skill 写规则提供模板）
> 非执行层：不直接产 cast 命令，提供对照结论。

---

## 1 · trigger

- 生成 evidence 后做合规对照（#16 conformance）。
- spawn 资产专属子 skill、需写入 ERC-3643 风格规则时取本层作模板。

---

## 2 · ERC-3643 / T-REX 对照

### 2.1 两道检查 = 你尽调闸门的链上对应物
转账执行前，Token 调用两个判定，都过才放行：
- `IdentityRegistry.isVerified(addr)` —— 身份/资格是否已验证。
- `Compliance.canTransfer(from, to, amount)` —— 是否满足业务规则。

> 映射：你发行前的「尽调 RED 闸门」是 T-REX 发行后两道检查的**前置镜像**。尽调挡住不合格的发行/onboard；T-REX 在每笔转账持续执行。二者互补，不必复刻全套合约。

### 2.2 六核心合约 + 角色
| 合约 | 职责 |
|---|---|
| Token (IToken) | 带合规钩子的 ERC-20 扩展 |
| IdentityRegistry | 钱包 ↔ 已验证身份映射 |
| IdentityRegistryStorage | 身份数据单独存（便于升级） |
| ModularCompliance | 定义/执行转账规则 |
| TrustedIssuersRegistry | 授权的声明签发方 |
| ClaimTopicsRegistry | 所需声明类型（如投资人认证） |

特权动作经 `IAgentRole` + ERC-173 ownership 控制：mint / burn / **forcedTransfer** / recovery。
> 对齐你的硬闸门：RED 时拒绝的正是 mint / registerIdentity / forcedTransfer —— 即 T-REX 中的 agent 特权动作。

### 2.3 tailor-made vs modular —— 决策
| | 写死(tailor-made) | 模块化(modular + Modules) |
|---|---|---|
| 透明度 | 逻辑直白 | 规则分散在 Module |
| 改规则 | 要动/重部署合约 | 增删 Module，不必重部署代币 |
| 适用 | 规则简单稳定 | 监管多变、多发行复用 |

> 给 spawn 子 skill 的建议：资产专属规则倾向 **modular**——资产差异（地域、投资人上限、锁定期）做成可插拔 Module，主合约不动。

### 2.4 已知攻击面（写进风控注记）
- 可信签发方被攻破 → 伪造资格声明。模型安全高度依赖签发方诚信。
- 未文档化的升级路径 → 机构尽调视为治理负债（呼应 onchain #10 proxy_upgradeable）。

---

## 3 · RWA red flags 清单（判 flag 的知识依据）

供 `offchain-diligence` 与 `infer` 字段引用：

| red flag | 严重度 | 对应 check |
|---|---|---|
| 无法律外壳定义持有人权利 | **risk** | legal_wrapper #14 |
| 声称持牌但监管公开库查无 | **risk** | issuer_background #12 |
| 自报储备、无独立预言机验证 | warn | custodian_attestation #13 |
| 无智能合约审计或 > 12 个月 | warn | audit_recency #15 |
| 未清晰披露地域限制 | warn | legal_wrapper / 对照 ClaimTopics |
| mint/burn 不透明（增发而储备不增） | warn→risk(叠加) | privileged_powers #9 + PoR |
| 源码未验证/混淆 | warn | contract_verified #8 |

> 共识原则：合法项目用多签 / 时间锁 / 放弃所有权限制集权；不透明几乎总是危险信号。独立审计的缺失被机构尽调当作风险信号。

---

## 4 · evidence 示例（#16 conformance 对照）

```json
{
  "check": "erc3643_conformance",
  "source": "knowledge_mapping",
  "result": {
    "has_identity_check": true,
    "has_transfer_rule_check": false,
    "forced_transfer_gated": true
  },
  "infer": "缺 canTransfer 等价的业务规则校验，发行后合规执行不完整",
  "flag": "warn"
}
```

---

## 5 · rating 衔接

本层多产 **warn**（知识对照是提示，不是定罪）。唯一例外：对照发现 target 复用了已知被攻破的 TrustedIssuer，可上升 risk（与制裁层逻辑一致）。其余进 warn 计数。

---

## 6 · 输出样例

```
[compliance-knowledge] target=资产X 发行配置
  ├─ identity check (isVerified 等价) : present     → ok
  ├─ transfer rule (canTransfer 等价) : MISSING      → warn
  ├─ forcedTransfer gated by AgentRole: yes          → ok
  └─ red flag scan                   : legal wrapper present, audit 5mo → ok
→ warn=1。建议 spawn 子 skill 补 modular Compliance 的 canTransfer 规则。
```

---

## 来源锚（供文档/答辩引用）
- EIP-3643 标准：https://eips.ethereum.org/EIPS/eip-3643
- ERC-3643 合约文档：https://docs.erc3643.org
- RWA red flags / 验证清单：https://metamask.io/news/how-to-verify-rwa-tokens
- 发行前 diligence 清单：https://investax.io/blog/legal-compliance-checklist-for-the-tokenization-of-real-world-assets-rwas
