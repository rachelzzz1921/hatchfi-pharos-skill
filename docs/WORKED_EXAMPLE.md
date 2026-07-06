# Worked Example · Full Issuance Flow (Atlantic · MPF)

> Example state: `state.example.json` · Spawned child: `skills/MPF-asset/` (v5)  
> **Live contract**: [`0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3`](https://atlantic.pharosscan.xyz/address/0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3)  
> **Mock OFAC oracle**: [`0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400`](https://atlantic.pharosscan.xyz/address/0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400)

This is the **exact flow** the submission package runs on Pharos Atlantic Testnet.

## Setup

```bash
cd pharos-rwa-skill   # or: cd "/Users/chenzhiwei/Desktop/skill to anything/pharos-rwa-skill"
export PATH="$HOME/.foundry/bin:$PATH"
export PRIVATE_KEY=0x...   # local shell only — never commit
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
export RPC=$PHAROS_RPC_URL
export PK=$PRIVATE_KEY
export DEPLOYER=$(cast wallet address --private-key $PK)
export ORACLE=0x4FD317Ec868fdbd6e95c56f157DDf86d7b97F400
```

## Step 0 · Sync sanctions snapshot (once per clone)

```bash
npm run diligence:sync
# → assets/knowledge/denylist_ofac_eth.json
# → merges into local state.json (gitignored)
```

## Step 1 · Diligence gate (Stage 0–2)

### Stage 0 — background (off-chain)

Collect `target_role`, `background.consent_granted`, KYC/jurisdiction fields per `references/offchain-diligence.md`.

### Stage 1 — sanctions (#1/#11)

```bash
# Local denylist membership (after diligence:sync)
# Oracle path:
cast call $ORACLE "isSanctioned(address)(bool)" $TARGET --rpc-url $RPC
cast call $ORACLE "isSanctioned(address)(bool)" 0x7F367cC41522cE07553e823bf3be79A889DEbe1B --rpc-url $RPC
# → true (RED demo)
```

### Stage 2 — on-chain (#2–#10)

```bash
cast code $TARGET --rpc-url $RPC
cast codesize $TARGET --rpc-url $RPC
cast balance $TARGET --rpc-url $RPC --ether
cast nonce $TARGET --rpc-url $RPC
```

Agent merges all evidence → `state.diligence` → pure-function rating:

- any `risk` → **RED** → refuse mint/registerIdentity
- ≥2 warn, no risk → **YELLOW**
- ≤1 warn → **GREEN**

See `state.example.json` for schema shape (`target_role`, `list_snapshots`, `checks_run`).

## Step 2 · Deploy CompliantRWAToken

```bash
npm run preflight:pharos
npm run deploy:pharos
# Result: 0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3
# Tx:     0xd00bcc18e78f85eaa9f62ee907a6adac13c9a45f6f7266699e57487beb61a023
```

## Step 3 · Smoke (register → attest → mint)

The hardened contract takes **3-arg** `registerIdentity` / `mint`, and `mint`
reverts unless the evidence hash is attested and passable. The tested one-command
path is `npm run smoke:pharos`; the explicit calls it makes are:

```bash
export TOKEN=0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3
export REGISTRY=0x0d21aED2e3d4c64B2e0Df556C7514b80CC4AB94F
export INV=$DEPLOYER
export ID=$(cast keccak "$INV")                  # any bytes32 identity id
export EVID=$(cast keccak "mpf-green-evidence")   # evidence hash
export FP=$(cast keccak "MPF-US-permissioned")    # asset fingerprint

# 1 · register identity (3-arg: + bytes32 identityId)
cast send $TOKEN "registerIdentity(address,uint16,bytes32)" $INV 840 $ID --rpc-url $RPC --private-key $PK
# 2 · attest a passable (GREEN=2) diligence conclusion for the evidence hash
cast send $REGISTRY "attest(bytes32,address,uint8,bytes32)" $EVID $INV 2 $FP --rpc-url $RPC --private-key $PK
# 3 · mint (3-arg: + evidenceHash) — reverts DiligenceNotAttested if not passable
cast send $TOKEN "mint(address,uint256,bytes32)" $INV 1000000000000000000000 $EVID --rpc-url $RPC --private-key $PK
cast call $TOKEN "isVerified(address)(bool)" $INV --rpc-url $RPC
```

## Step 4 · Spawn private operating skill

```bash
npm run spawn:asset
# → skills/MPF-asset/ with 4 diligence references + issuance + dividend
```

## Optional · Deploy your own Mock Oracle

```bash
npm run deploy:mock-ofac
# writes state.config.ofac_oracle (local only)
```

## Output samples

### GREEN (clean investor EOA)

```
Diligence: 🟢 GREEN (passed)
Target: 0xA54A… role=investor
Evidence: sanctions_screen ok · wallet_maturity ok · kyc_expiry ok
→ proceed to registerIdentity / mint
```

### YELLOW (proxy + contract wallet warns)

```
Diligence: 🟡 YELLOW (passed — review recommended)
→ risk=0, warn=2 · human review before whitelisting
```

### RED (sanctions hit)

```
Diligence: 🔴 RED (NOT passed)
Evidence: ofac_sanctioned → true (0x7F367…)
→ refuse all issuance to target
```
