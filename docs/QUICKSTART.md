# Quickstart · 5 Minutes to Reproduce

> **Already deployed on Atlantic**: MPF @ [`0xfef7519bebda6c47af49583dbc9e60801f8aa3de`](https://atlantic.pharosscan.xyz/address/0xfef7519bebda6c47af49583dbc9e60801f8aa3de) · spawned skill `../skills/MPF-asset/`

## 1. Local proof (no wallet needed)

```bash
cd pharos-rwa-skill
npm run build    # forge build
npm run test     # 36 passed; 0 failed
```

## 2. Atlantic deploy + smoke + spawn (wallet required)

```bash
export PRIVATE_KEY=0x...          # local terminal only — never commit
export PHAROS_RPC_URL=https://atlantic.dplabs-internal.com

npm run preflight:pharos          # chainId 688689, balance > 0
npm run deploy:pharos             # or see low-balance tip below
npm run smoke:pharos              # registerIdentity + mint(1e18)
npm run spawn:asset               # → skills/MPF-asset/
```

**Low PHRS balance?** Deploy with explicit gas price (~3 gwei):

```bash
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$PHAROS_RPC_URL" --private-key "$PRIVATE_KEY" \
  --broadcast --slow --legacy --with-gas-price 3000000000 --gas-limit 3500000
bash scripts/post-deploy.sh
```

## 3. Reuse the spawned asset skill

Point any agent at `skills/MPF-asset/SKILL.md` — contract address and commands are **already fixed**. No redeploy needed to manage MPF dividends, whitelist, or lifecycle ops.

## 4. Where evidence lives

| File | What |
|---|---|
| `COMPLETED_VALIDATION.md` | Local + on-chain validation summary |
| `deployments/pharos.json` | Machine-readable deploy metadata |
| `DEPLOYMENT_RESULT.md` | Deploy + smoke record |
| `WORKED_EXAMPLE.md` | Full command flow + `state.example.json` |
| `SECURITY.md` | Audit findings table |

## Troubleshooting

| Symptom | Fix |
|---|---|
| `PRIVATE_KEY 格式应为 0x + 64 hex` | `export PRIVATE_KEY=0x$PRIVATE_KEY` if missing `0x` prefix |
| Deploy fails · insufficient funds | Need ~0.035 PHRS @ 11 gwei; use `--legacy --with-gas-price 3000000000` or claim more PHRS |
| `cast receipt json` error in smoke | Use `cast receipt ... --json` (fixed in `scripts/smoke.sh`) |
| `spawn:asset` fails | Run deploy first; needs `deployments/pharos.json` or `state.json` with `asset.address` |
