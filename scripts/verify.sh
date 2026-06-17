#!/usr/bin/env bash
# 尝试 Blockscout verify — 失败不阻塞，结果记入 DEPLOYMENT_RESULT.md
set -euo pipefail

DEPLOY_FILE="deployments/pharos.json"
if [ ! -f "$DEPLOY_FILE" ]; then
  echo "SKIP: 无部署记录"
  exit 0
fi

ADDR=$(python3 -c "import json; print(json.load(open('$DEPLOY_FILE'))['contractAddress'])")
NAME=$(python3 -c "import json; d=json.load(open('$DEPLOY_FILE')); print(d.get('constructorArgs',{}).get('name','Manhattan Property Fund'))")
SYMBOL=$(python3 -c "import json; d=json.load(open('$DEPLOY_FILE')); print(d.get('constructorArgs',{}).get('symbol','MPF'))")
MAX_H=$(python3 -c "import json; d=json.load(open('$DEPLOY_FILE')); print(d.get('constructorArgs',{}).get('maxHolders','100'))")
MAX_B=$(python3 -c "import json; d=json.load(open('$DEPLOY_FILE')); print(d.get('constructorArgs',{}).get('maxBalancePerInvestor','1000000000000000000000000'))")

ARGS=$(cast abi-encode "constructor(string,string,uint256,uint256)" "$NAME" "$SYMBOL" "$MAX_H" "$MAX_B")

echo "== Verify CompliantRWAToken @ $ADDR =="

if forge verify-contract "$ADDR" src/CompliantRWAToken.sol:CompliantRWAToken \
  --verifier blockscout \
  --verifier-url "https://api.socialscan.io/pharos-atlantic-testnet/v1/explorer/command_api/contract" \
  --constructor-args "$ARGS" \
  --chain-id 688689 2>&1; then
  echo "Verify: PASS"
  python3 -c "
import json
d=json.load(open('$DEPLOY_FILE'))
d['verified']=True
json.dump(d, open('$DEPLOY_FILE','w'), indent=2)
open('$DEPLOY_FILE','a').write('\n')
"
  python3 -c "from pathlib import Path
p=Path('DEPLOYMENT_RESULT.md')
if p.exists():
    s=p.read_text()
    section='## Verify\n\nStatus: PASS\n\n'
    i=s.find('## Verify')
    j=s.find('## Frontend env', i)
    p.write_text(s[:i]+section+s[j:] if i!=-1 and j!=-1 else s+'\\n'+section)"
else
  echo "Verify: FAIL (non-blocking — see DEPLOYMENT_RESULT.md)"
  python3 -c "
import json
d=json.load(open('$DEPLOY_FILE'))
d['verified']=False
d['verifyNote']='forge verify-contract failed; manual verify on explorer if needed'
json.dump(d, open('$DEPLOY_FILE','w'), indent=2)
open('$DEPLOY_FILE','a').write('\n')
"
  python3 -c "from pathlib import Path
p=Path('DEPLOYMENT_RESULT.md')
if p.exists():
    s=p.read_text()
    section='## Verify\n\nStatus: FAIL (non-blocking). Manual verify on explorer if needed.\n\n'
    i=s.find('## Verify')
    j=s.find('## Frontend env', i)
    p.write_text(s[:i]+section+s[j:] if i!=-1 and j!=-1 else s+'\\n'+section)"
  exit 0
fi
