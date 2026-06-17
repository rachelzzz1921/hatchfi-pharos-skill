#!/usr/bin/env bash
# Pharos Atlantic 部署前自检 — 只读 env，不打印私钥
set -euo pipefail

RPC_URL="${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}"
EXPECTED_CHAIN=688689

echo "== Pharos Atlantic Preflight =="

# 1. PRIVATE_KEY
if [ -z "${PRIVATE_KEY:-}" ]; then
  echo "Status: FAIL"
  echo "Reason: PRIVATE_KEY 未设置"
  echo "Fix: export PRIVATE_KEY=0x...  （不要写入文件或提交 git）"
  exit 1
fi

if ! [[ "$PRIVATE_KEY" =~ ^0x[0-9a-fA-F]{64}$ ]]; then
  echo "Status: FAIL"
  echo "Reason: PRIVATE_KEY 格式应为 0x + 64 位 hex"
  exit 1
fi
echo "PRIVATE_KEY: set (hidden)"

# 2. RPC + chainId
CHAIN_ID=$(cast chain-id --rpc-url "$RPC_URL" 2>/dev/null) || {
  echo "Status: FAIL"
  echo "Reason: 无法连接 RPC: $RPC_URL"
  echo "Fix: export PHAROS_RPC_URL=... 并重试"
  exit 1
}

if [ "$CHAIN_ID" != "$EXPECTED_CHAIN" ]; then
  echo "Status: FAIL"
  echo "Reason: chainId=$CHAIN_ID，期望 $EXPECTED_CHAIN"
  exit 1
fi

# 3. Wallet + balance
WALLET=$(cast wallet address --private-key "$PRIVATE_KEY")
BALANCE_WEI=$(cast balance "$WALLET" --rpc-url "$RPC_URL")
BALANCE_ETH=$(cast --to-unit "$BALANCE_WEI" ether)
BLOCK=$(cast block-number --rpc-url "$RPC_URL")
GAS=$(cast gas-price --rpc-url "$RPC_URL")

echo ""
echo "Network:     Pharos Atlantic Testnet"
echo "Chain ID:    $CHAIN_ID"
echo "RPC:         $RPC_URL"
echo "Wallet:      $WALLET"
echo "Balance:     $BALANCE_ETH PHRS"
echo "Block:       $BLOCK"
echo "Gas Price:   $GAS wei"
echo ""

if [ "$BALANCE_WEI" = "0" ]; then
  echo "Status: FAIL"
  echo "Reason: 余额为 0，无法部署"
  echo "Fix: 去 faucet 领 PHRS（只填钱包地址，不要输入私钥）："
  echo "  - https://testnet.pharosnetwork.xyz/"
  echo "  - https://www.gas.zip/faucet/pharos"
  echo "  - https://zan.top/faucet/pharos"
  exit 1
fi

echo "Status: OK"
