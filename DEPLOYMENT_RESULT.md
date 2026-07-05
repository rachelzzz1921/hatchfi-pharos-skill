# Deployment Result · CompliantRWAToken

## Summary

| Field | Value |
|---|---|
| Framework | Foundry |
| Contract | CompliantRWAToken |
| Network | Pharos Atlantic Testnet |
| Chain ID | 688689 |
| Address |  |
| Deploy Tx |  |
| Deployer |  |
| Deployed At | 2026-07-05T17:27:14Z |

## Explorer

- [PharosScan Address](https://atlantic.pharosscan.xyz/address/0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3)
- [PharosScan Tx](https://atlantic.pharosscan.xyz/tx/0xd00bcc18e78f85eaa9f62ee907a6adac13c9a45f6f7266699e57487beb61a023)
- [Socialscan Address](https://pharos-testnet.socialscan.io/address/0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3)

## Smoke Test

| Check | Result |
|---|---|
| registerIdentity | skipped |
| mint | 0x1b212771313c0ad0b382f99c69c027bdd5265e0cc64b619792adbd9038063905 |
| isVerified(deployer) | true |
| balanceOf(deployer) | 1000000000000000000 [1e18] |
| holderCount | 1 |

## Verify

Run: `npm run verify:pharos` (optional, non-blocking)

## Frontend env (if needed later)

```
VITE_CONTRACT_ADDRESS=0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3
VITE_CHAIN_ID=688689
VITE_PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
```
