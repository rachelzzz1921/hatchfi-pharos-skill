# Worked Example · Full Issuance Flow (Atlantic · MPF)

> Example state: `state.example.json` · Spawned child: `skills/MPF-asset/`  
> **Live contract**: [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)

This is the **exact flow** the submission package ran on Pharos Atlantic Testnet.

## Setup

```bash
cd pharos-rwa-skill
export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0x...   # local only
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
export RPC=$PHAROS_RPC_URL
export PK=$PRIVATE_KEY
export DEPLOYER=$(cast wallet address --private-key $PK)
```

## Step 1 · Diligence gate (read-only)

```bash
# Example checks from references/onchain-diligence.md
cast code $DEPLOYER --rpc-url $RPC          # 0x → EOA
cast balance $DEPLOYER --rpc-url $RPC --ether
cast nonce $DEPLOYER --rpc-url $RPC
```

Agent writes evidence → `state.json` → `diligence.rating=GREEN`, `passed=true`.  
See `state.example.json` for the full shape.

## Step 2 · Deploy CompliantRWAToken

```bash
npm run preflight:pharos
npm run deploy:pharos
# Result: 0xfef7519bebda6c47af49583dbc9e60801f8aa3de
# Tx:     0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d
```

## Step 3 · Smoke · register + mint

```bash
npm run smoke:pharos
# mint(deployer, 1e18) → tx 0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541
# isVerified(deployer)=true, balanceOf=1e18, holderCount=1
```

Manual equivalent:

```bash
TOKEN=0xfef7519bebda6c47af49583dbc9e60801f8aa3de
cast send $TOKEN "registerIdentity(address,uint16)" $DEPLOYER 840 \
  --rpc-url $RPC --private-key $PK
cast send $TOKEN "mint(address,uint256)" $DEPLOYER 1000000000000000000 \
  --rpc-url $RPC --private-key $PK
cast receipt <txhash> --rpc-url $RPC --json   # status must be 0x1
```

## Step 4 · Spawn asset skill (flywheel)

```bash
npm run spawn:asset
# → skills/MPF-asset/SKILL.md + references/MPF-*.md
```

Any other agent can now import `skills/MPF-asset/` and operate MPF **without redeploying**.

## Step 5 · Verify reads (anyone)

```bash
cast call $TOKEN "name()(string)" --rpc-url $RPC
cast call $TOKEN "symbol()(string)" --rpc-url $RPC
cast call $TOKEN "isVerified(address)(bool)" $DEPLOYER --rpc-url $RPC
cast call $TOKEN "balanceOf(address)(uint256)" $DEPLOYER --rpc-url $RPC
cast call $TOKEN "holderCount()(uint256)" --rpc-url $RPC
```

## What this proves for judges

| Criterion | Evidence in this flow |
|---|---|
| Technical quality | 24 Foundry tests + live contract on Atlantic |
| Agent use case | Diligence → deploy → mint with pre-checks + state.json |
| Reusability | `skills/MPF-asset/` spawned with fixed address |
| Pharos integration | chainId 688689, Foundry/cast, Skill Engine pre-checks |
| Flywheel | Parent skill produces child skill — **already done for MPF** |
