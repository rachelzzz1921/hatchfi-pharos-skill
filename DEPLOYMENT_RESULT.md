# Deployment Result · CompliantRWAToken

## Summary

| Field | Value |
|---|---|
| Framework | Foundry |
| Contract | CompliantRWAToken |
| Network | Pharos Atlantic Testnet |
| Chain ID | 688689 |
| Address | `0xfef7519bebda6c47af49583dbc9e60801f8aa3de` |
| Deploy Tx | `0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d` |
| Deployer | `0xA54A3C2766a80d3AFe7C4Bf00D5bcfF9e1892bc4` |
| Deployed At | 2026-06-17T06:27:16Z |

## Explorer

- [PharosScan Address](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)
- [PharosScan Tx](https://atlantic.pharosscan.xyz/tx/0x71ebe568c6d41390cfc6b6f452c30c85d38d0b4ddead941d19383a7e39417e4d)
- [Socialscan Address](https://pharos-testnet.socialscan.io/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de)

## Smoke Test

| Check | Result |
|---|---|
| registerIdentity | skipped |
| mint | 0x7ece3b86646685fbf9312bf91b68fc18ae694c3ccd50e8fdba148d6348bb5541 |
| isVerified(deployer) | true |
| balanceOf(deployer) | 1000000000000000000 [1e18] |
| holderCount | 1 |

## Verify

Run: `npm run verify:pharos` (optional, non-blocking)

## Frontend env (if needed later)

```
VITE_CONTRACT_ADDRESS=0xfef7519bebda6c47af49583dbc9e60801f8aa3de
VITE_CHAIN_ID=688689
VITE_PHAROS_RPC_URL=https://atlantic.dplabs-internal.com
```
