# Pharos RWA Skill · Verification Loop

> 本项目的分阶段质量门禁：每完成一个大阶段执行对应 Phase。
> Agent 每完成一个大阶段后执行对应 Phase；**任一 Phase FAIL → 停止，报告，不继续链上操作**。

## 何时触发

- 修改合约 / 测试 / 部署脚本后
- `forge build` / `forge test` 之前（本地 gate）
- 部署前（Phase 5 preflight）
- 部署后（Phase 6 smoke）
- 提交参赛前（Phase 7 全量 `./check.sh`）

---

## Phase 1 · 依赖与工具链

```bash
command -v forge && forge --version
command -v cast && cast --version
[ -d lib/openzeppelin-contracts ] && [ -d lib/forge-std ]
```

**FAIL 处理**：`curl -L https://foundry.paradigm.xyz | bash && foundryup`，再 `forge install`。

---

## Phase 2 · 编译（零错误零警告）

```bash
forge build
```

**FAIL 处理**：仅做最小化修复（import、OZ v5 接口、pragma）。**不改 ERC-3643 业务语义**。记录改动到 `SECURITY.md` 或提交说明。

---

## Phase 3 · 单元测试（16 用例全绿）

```bash
forge test -vvv
```

**FAIL 处理**：
- 断言/revert selector 与实现不符 → 优先修测试
- 不变量被违反 → **停，报告作者**，不擅自改合约逻辑

报告格式：`Total: X | Passed: X | Failed: 0`

---

## Phase 4 · 安全扫描

```bash
# 私钥 / 助记词泄露
! grep -rnE "(PRIVATE_KEY|MNEMONIC)=0x[0-9a-fA-F]{40,}" . \
  --include="*.md" --include="*.sh" --include="*.sol" --include="*.json" 2>/dev/null

# .env 必须在 .gitignore
grep -q "^\.env$" .gitignore

# 占位符（繁殖产物外不应残留）
grep -rn "<token>\|0xABC\.\.\." references/ SKILL.md 2>/dev/null | grep -v spawn-asset-skill || true
```

**FAIL 处理**：删除或替换泄露内容；绝不提交 `.env`。

---

## Phase 5 · 部署前 Preflight（需 PRIVATE_KEY）

```bash
npm run preflight:pharos
# 或: ./scripts/preflight.sh
```

检查项：
1. `PRIVATE_KEY` 存在且格式 `0x` + 64 hex
2. RPC 可连（`PHAROS_RPC_URL` 默认 `https://atlantic.dplabs-internal.com`）
3. `chainId == 688689`
4. 钱包地址可推导
5. PHRS 余额 > 0
6. `blockNumber`、`gasPrice` 可读

**余额为 0 → STOP**，提示 faucet（不索要私钥）：
- https://testnet.pharosnetwork.xyz/
- https://www.gas.zip/faucet/pharos
- https://zan.top/faucet/pharos

---

## Phase 6 · 部署 + 冒烟

```bash
npm run deploy:pharos    # forge script --broadcast
npm run smoke:pharos     # read + registerIdentity + mint 1 wei
```

每笔 `cast send` 后 `cast receipt` 验 `status == 1`。

**Write 边界（已确认）**：
- ✅ `registerIdentity(deployer)`、`mint(deployer, 1e18)`
- ❌ `transferOwnership`、`forcedTransfer`、`depositDividend`（大额）、`recoveryAddress`

结果写入 `deployments/pharos.json` + `DEPLOYMENT_RESULT.md` + `state.json`（asset 段）。

---

## Phase 7 · 合约 Verify（记录浏览器验证结果）

```bash
npm run verify:pharos
```

验证结果写入 `DEPLOYMENT_RESULT.md`，随后进入 Phase 8。

---

## Phase 8 · 自我繁殖 + 提交体检

```bash
# 按 references/spawn-asset-skill.md 生成 skills/<symbol>-asset/
./check.sh
git status   # 确认无 .env / 私钥
```

---

## 输出模板（VERIFICATION REPORT）

```
VERIFICATION REPORT · Compliant RWA Issuance Agent
==================================================
Phase 1 Toolchain:   [PASS/FAIL]
Phase 2 Build:       [PASS/FAIL]
Phase 3 Tests:       [PASS/FAIL] (X/16)
Phase 4 Security:    [PASS/FAIL]
Phase 5 Preflight:   [PASS/FAIL/SKIP]
Phase 6 Deploy+Smoke:[PASS/FAIL/SKIP]
Phase 7 Verify:      [PASS/FAIL/SKIP]
Phase 8 Submit:      [PASS/FAIL/SKIP]

Overall: [READY FOR SUBMIT / NOT READY]

Issues:
1. ...
```

## 与 SKILL.md 的衔接

| SKILL 纪律 | 对应 Phase |
|---|---|
| 尽调前置 | Phase 5 前读 `state.diligence` |
| 高风险人确认 | Phase 6 deploy/mint 前确认卡片 |
| 操作后断言 | Phase 6 每笔 receipt |
| 全程留痕 | Phase 6→8 写 state.json |
| 私钥安全 | Phase 4 + 5 只读 env |
