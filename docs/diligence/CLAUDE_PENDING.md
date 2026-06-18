# Claude 第二轮 · 整合完成

> **状态**：✅ Claude 四稿已从 `HatchFi 合规 RWA Agent 尽调体系扩展方案/` 整合进 `references/`。  
> **原始归档**：`docs/diligence/claude-source/`  
> **适配说明**：`INTEGRATION.md` §3

---

## 填表状态

| 交付物 | 状态 | 落地路径 |
|---|---|---|
| offchain-diligence.md | ✅ Claude 已整合 | `references/offchain-diligence.md` |
| compliance-knowledge.md | ✅ | `references/compliance-knowledge.md` |
| sanctions-screening.md | ✅ | `references/sanctions-screening.md` |
| onchain-diligence.md | ✅ | `references/onchain-diligence.md` |
| SKILL.md 尽调段落 | ✅（第六轮 earlier + role 映射） | `SKILL.md` |
| GREEN/YELLOW/RED 样例 | ✅ 分散在各 reference §5 | — |
| DECISIONS.md | ✅ 第七轮 | 根目录 `DECISIONS.md` |

---

## Claude 与 Gemini 差异记录（最终采用）

| 主题 | Gemini 版 | Claude 版 | 最终采用 |
|---|---|---|---|
| 链下 evidence | 必须 `cmd` | 不要 `cmd`，用 `verified_by` | **`cmd` + 可选 `verified_by`** |
| consent 拒绝 | risk | skip 链下 | **Claude skip** |
| 制裁 | Mock Oracle | 0xB10C JSON + stale warn | **合并** |
| 链上检查 | 5–7 项 | 11 项编号 | **Claude 11 项** |
| ISS/CUS/INT 链下 | 简版 questionnaire | 完整 #12–#15 | **Claude** |
| 编排 | Python 脚本 | reference playbooks | **Skill playbooks** |

---

## 若 Claude 后续再修订

将新稿粘贴到下方，并注明要覆盖的 section：

### 修订区（可选）

_（空）_
