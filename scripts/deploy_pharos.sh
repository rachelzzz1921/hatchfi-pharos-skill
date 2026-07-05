#!/usr/bin/env bash
set -euo pipefail

# Resolve PRIVATE_KEY / RPC with environment taking priority over .env.
# (Do not reverse this order — env-provided keys must win over committed .env.)
ENV_PRIVATE_KEY_SET=0
ENV_PRIVATE_KEY_VALUE=""
if [ -n "${PRIVATE_KEY:-}" ]; then
  ENV_PRIVATE_KEY_SET=1
  ENV_PRIVATE_KEY_VALUE="$PRIVATE_KEY"
fi

ENV_RPC_SET=0
ENV_RPC_VALUE=""
if [ -n "${PHAROS_RPC_URL:-}" ]; then
  ENV_RPC_SET=1
  ENV_RPC_VALUE="$PHAROS_RPC_URL"
fi

if [ -f ".env" ]; then
  set -a
  # shellcheck disable=SC1091
  . ./.env
  set +a
fi

KEY_SOURCE="missing"
if [ "$ENV_PRIVATE_KEY_SET" -eq 1 ]; then
  PRIVATE_KEY="$ENV_PRIVATE_KEY_VALUE"
  KEY_SOURCE="env"
elif [ -n "${PRIVATE_KEY:-}" ]; then
  KEY_SOURCE="dotenv"
fi

RPC_SOURCE="default"
if [ "$ENV_RPC_SET" -eq 1 ]; then
  PHAROS_RPC_URL="$ENV_RPC_VALUE"
  RPC_SOURCE="env"
elif [ -n "${PHAROS_RPC_URL:-}" ]; then
  RPC_SOURCE="dotenv"
fi

DEPLOY_GAS_LIMIT="${PHAROS_DEPLOY_GAS_LIMIT:-5500000}"
DEPLOY_GAS_PRICE_WEI="${PHAROS_DEPLOY_GAS_PRICE_WEI:-3000000000}"
export PHAROS_DEPLOY_GAS_LIMIT="$DEPLOY_GAS_LIMIT"
export PHAROS_DEPLOY_GAS_PRICE_WEI="$DEPLOY_GAS_PRICE_WEI"
export PHAROS_KEY_SOURCE="$KEY_SOURCE"
export PHAROS_RPC_SOURCE="$RPC_SOURCE"

bash scripts/preflight.sh
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "${PHAROS_RPC_URL:-https://atlantic.dplabs-internal.com}" \
  --private-key "$PRIVATE_KEY" \
  --broadcast \
  --slow \
  --legacy \
  --with-gas-price "$DEPLOY_GAS_PRICE_WEI" \
  --gas-limit "$DEPLOY_GAS_LIMIT"
bash scripts/post-deploy.sh
