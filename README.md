<div align="center">

# HatchFi · 链孵

**Where compliant RWAs hatch into Agent Skills.**
**把合规 RWA 孵化成可复用 Agent Skill。**

Pharos Skill-to-Agent package · live on Atlantic · Skill→Skill flywheel

[![tests](https://img.shields.io/badge/Foundry_tests-24_passed-3dd68c)](./COMPLETED_VALIDATION.md)
[![network](https://img.shields.io/badge/Pharos_Atlantic-chainId_688689-2dd4bf)](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
[![status](https://img.shields.io/badge/status-deployed_%26_smoke_passed-c9a227)](./DEPLOYMENT_RESULT.md)
[![standard](https://img.shields.io/badge/ERC--3643-style-0b3d2e)](./src/CompliantRWAToken.sol)

**📊 [Submission Dashboard (rendered)](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html)**  ·  [Markdown 版](./SUBMISSION_DASHBOARD.md)

</div>

---

HatchFi is an agent-native issuance layer for compliant RealFi on Pharos. It turns regulated RWA launch operations into verifiable Agent Skills, then turns **each issued asset into a reusable capability** for the next agent.

> 一个面向 **Pharos** 的合规 RWA 发行 Skill：把"发行一支受监管的链上资产"做成一条 AI agent 可端到端驱动的流水线。

```
① Diligence Gate  →  ② Compliant Issuance (ERC-3643)  →  ③ Skill Hatch
   read-only risk        deploy / transfer / freeze / dividend     spawn reusable asset Skill
   尽调闸门               合规发行全生命周期                          产出资产专属可复用 Skill
```

## ⛓ Live on Pharos Atlantic · 链上证据

| Item | Value |
|---|---|
| Asset | Manhattan Property Fund · `MPF` |
| Contract | [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) |
| Deploy tx | [`0x71ebe5…17e4d`](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d) |
| Smoke mint tx | [`0x7ece3b…b5541`](https://atlantic.pharosscan.xyz/tx/0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541) |
| Network | Pharos Atlantic Testnet · chainId `688689` |
| Spawned Skill | [`skills/MPF-asset/`](./skills/MPF-asset/SKILL.md) |

## What problem it solves · 解决什么

RWA issuance is not just "deploying a token." A compliant real-world asset needs investor eligibility, restricted transfers, lifecycle controls, auditable yield, and pre-issuance diligence — none of which standard ERC-20 provides.

> RWA 上链的核心障碍不是"发个代币"，而是**合规**：只有合格投资者能持有、转账受监管规则约束、要能冻结/强制划转/追溯。HatchFi 基于 **ERC-3643（T-REX）** 标准实现"默认禁止转账、每笔转移强制通过身份验证 + 合规规则两道检查"，并配套发行前尽调与收益派息。

## Three highlights · 三个特点

- **Compliance-first** · ERC-3643 identity registry, restricted transfer, freeze, forced transfer, wallet recovery — names aligned with the standard.
- **Evidence-backed diligence** · every GREEN/YELLOW/RED rating traces to a specific read-only `cast` call; RED blocks issuance.
- **Self-spawning flywheel (proven)** · every issued asset auto-generates `skills/<SYMBOL>-asset/` with the contract address and command set baked in — other agents reuse it without redeploying.

## Quickstart · 怎么跑

```bash
# 1. Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup
forge install OpenZeppelin/openzeppelin-contracts@v5.1.0
forge install foundry-rs/forge-std

# 2. Build + test + self-check
npm run build
npm run test     # 24 passed
npm run check    # no hardcoded keys

# 3. Deploy to Atlantic (key via env, never committed)
export PRIVATE_KEY=0x...
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
npm run preflight:pharos
npm run deploy:pharos
npm run smoke:pharos
npm run spawn:asset   # → skills/MPF-asset/
```

More: [`QUICKSTART.md`](./QUICKSTART.md) · [`WORKED_EXAMPLE.md`](./WORKED_EXAMPLE.md) · [`VALIDATION_PLAN.md`](./VALIDATION_PLAN.md)

## Documentation · 文档导航

| Doc | 内容 |
|---|---|
| [`SKILL.md`](./SKILL.md) | Agent entry — capability index, pre-checks, risk tiers |
| [`SUBMISSION_DASHBOARD.html`](https://htmlpreview.github.io/?https://github.com/rachelzzz1921/hatchfi-pharos-skill/blob/main/SUBMISSION_DASHBOARD.html) | 可视化看板（渲染版） |
| [`COMPLETED_VALIDATION.md`](./COMPLETED_VALIDATION.md) | Local + on-chain validation evidence |
| [`DEPLOYMENT_RESULT.md`](./DEPLOYMENT_RESULT.md) | Deploy + smoke record |
| [`SECURITY.md`](./SECURITY.md) | Audit findings & fixes |
| [`PHAROS_VISION.md`](./PHAROS_VISION.md) | RealFi / Agentic vision alignment |
| [`BRAND.md`](./BRAND.md) | HatchFi brand kit |

## Structure · 结构

```
SKILL.md                       Agent entry: intent → capability → risk tier → reference
state.schema.json              Cross-step state memory (diligence → issue → dividend + audit)
src/CompliantRWAToken.sol      ERC-3643-style RWA token (20 external fns / 12 events / 5 errors)
references/                    7 cast/forge command references
script/Deploy.s.sol            Deploy script
scripts/                       preflight / post-deploy / smoke / verify / spawn
test/CompliantRWAToken.t.sol   24 tests (incl. fuzz)
skills/MPF-asset/              Spawned asset Skill (flywheel artifact)
```

## Risk tiers · 操作风险三档

| Tier | Operations | Agent behavior |
|---|---|---|
| 🟢 Low | all views / diligence / spawn | fully automatic |
| 🟡 Medium | register / freeze / rule changes / agents | auto + audit trail |
| 🔴 High | deploy / mint / burn / dividend / forcedTransfer / recovery | confirm card required |

---

<div align="center">

Built by **Zhiwei Chen (陈知维)** · researcher at The Chinese University of Hong Kong
Pharos Skill-to-Agent Hackathon · 2026

</div>
