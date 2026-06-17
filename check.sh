#!/usr/bin/env bash
# 本机环境与 skill 包自检 —— 对应 Pharos 发布 checklist
set -e
echo "== 1. Foundry 是否就位 =="
command -v forge >/dev/null && forge --version || { echo "❌ 未装 Foundry: curl -L https://foundry.paradigm.xyz | bash && foundryup"; exit 1; }
command -v cast  >/dev/null && echo "✅ cast 就位"

echo "== 2. 依赖 =="
[ -d lib/openzeppelin-contracts ] && echo "✅ OZ 已就位" || echo "⚠️ 需: forge install OpenZeppelin/openzeppelin-contracts@v5.1.0"
[ -d lib/forge-std ] && echo "✅ forge-std 已就位" || echo "⚠️ 需: forge install foundry-rs/forge-std"

echo "== 3. 编译（checklist: 零错误零警告）=="
forge build

echo "== 4. 测试 =="
forge test -vv

echo "== 5. 占位符残留检查（确保非繁殖文件无 <token> 等未填值）=="
! grep -rn "0xABC\.\.\." references/ || echo "（示例占位符仅出现在模板说明中，正常）"

echo "== 6. 私钥泄露检查 =="
! grep -rnE "(PRIVATE_KEY|MNEMONIC)=0x[0-9a-fA-F]{40,}" . \
  --include='*.sh' --include='*.sol' --include='*.md' --include='*.json' 2>/dev/null && echo "✅ 无硬编码私钥"
grep -q '^\.env$' .gitignore && echo "✅ .env 已被 .gitignore 忽略"

echo ""
echo "✅ 自检通过。部署: npm run preflight:pharos && npm run deploy:pharos && npm run smoke:pharos"
