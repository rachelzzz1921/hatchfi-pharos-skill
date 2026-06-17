#!/usr/bin/env python3
"""Generate an asset-specific skill from the deployed CompliantRWAToken state."""

from __future__ import annotations

import datetime as _dt
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "state.json"
DEPLOYMENT = ROOT / "deployments" / "pharos.json"


def _load_asset() -> dict:
    if STATE.exists():
        state = json.loads(STATE.read_text())
        asset = state.get("asset") or {}
        if asset.get("address") or asset.get("token"):
            return {
                "address": asset.get("address") or asset.get("token"),
                "name": asset.get("name", "Manhattan Property Fund"),
                "symbol": asset.get("symbol", "MPF"),
                "max_holders": asset.get("max_holders") or asset.get("maxHolders", 100),
                "max_balance": asset.get("max_balance_per_investor")
                or asset.get("maxBalancePerInvestor", "1000000000000000000000000"),
            }

    if DEPLOYMENT.exists():
        dep = json.loads(DEPLOYMENT.read_text())
        args = dep.get("constructorArgs", {})
        return {
            "address": dep["contractAddress"],
            "name": args.get("name", "Manhattan Property Fund"),
            "symbol": args.get("symbol", "MPF"),
            "max_holders": args.get("maxHolders", 100),
            "max_balance": args.get("maxBalancePerInvestor", "1000000000000000000000000"),
        }

    raise SystemExit("No deployed asset found. Run npm run deploy:pharos first.")


def _safe_symbol(symbol: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "-", symbol.strip())
    if not cleaned:
        raise SystemExit("Invalid asset symbol")
    return cleaned


def _replace_template(text: str, asset: dict) -> str:
    symbol = asset["symbol"]
    replacements = {
        "<token>": asset["address"],
        "<SYMBOL>": symbol,
        "<symbol>": symbol,
        "<name>": asset["name"],
        "<maxHolders>": str(asset["max_holders"]),
        "<maxBalancePerInvestor>": str(asset["max_balance"]),
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    return text


def _write_skill(asset: dict, out_dir: Path) -> None:
    symbol = asset["symbol"]
    issuance_ref = f"references/{symbol}-issuance.md"
    diligence_ref = f"references/{symbol}-diligence.md"
    dividend_ref = f"references/{symbol}-dividend.md"

    (out_dir / "SKILL.md").write_text(
        f"""---
name: {symbol.lower()}-asset
description: Asset-specific operations for {asset['name']} ({symbol}) on Pharos Atlantic Testnet. Use this skill whenever a user asks to manage, inspect, whitelist, mint, transfer-check, or distribute dividends for this exact deployed RWA asset.
---

# Skill: {symbol} Asset Operations ({asset['name']})

> Contract: `{asset['address']}` (`CompliantRWAToken`, Pharos Atlantic Testnet)
> Generated deterministically from the parent Compliant RWA Issuance Agent.

## Capability Index

| User intent | Operation | Risk | Reference |
|---|---|---|---|
| Check whether an address can hold {symbol} | `isVerified` | low | `{issuance_ref}` |
| Register a compliant investor | `registerIdentity` | medium | `{issuance_ref}` |
| Mint additional {symbol} shares | `mint` | high | `{issuance_ref}` |
| Preview transfer compliance | `canTransfer` | low | `{issuance_ref}` |
| Freeze or unfreeze wallet/shares | freeze functions | medium | `{issuance_ref}` |
| Force transfer or recover wallet | lifecycle functions | high | `{issuance_ref}` |
| Deposit asset dividends | `depositDividend` | high | `{dividend_ref}` |
| Check or claim dividends | `dividendOf` / `claimDividend` | low | `{dividend_ref}` |
| Run diligence on related addresses | onchain diligence | low | `{diligence_ref}` |

## Asset Constants

- `TOKEN={asset['address']}`
- `SYMBOL={symbol}`
- `NAME={asset['name']}`
- `MAX_HOLDERS={asset['max_holders']}`
- `MAX_BALANCE_PER_INVESTOR={asset['max_balance']}`
""",
        encoding="utf-8",
    )


def main() -> None:
    asset = _load_asset()
    symbol = _safe_symbol(asset["symbol"])
    out_dir = ROOT / "skills" / f"{symbol}-asset"
    refs_dir = out_dir / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)

    _write_skill(asset, out_dir)

    templates = {
        ROOT / "references" / "onchain-diligence.md": refs_dir / f"{symbol}-diligence.md",
        ROOT / "references" / "rwa-issuance.md": refs_dir / f"{symbol}-issuance.md",
        ROOT / "references" / "rwa-dividend.md": refs_dir / f"{symbol}-dividend.md",
    }
    for src, dst in templates.items():
        content = src.read_text(encoding="utf-8")
        header = (
            f"# {symbol}-bound reference\n\n"
            f"> Asset: `{asset['name']}` (`{symbol}`)\n"
            f"> Token: `{asset['address']}`\n"
            f"> This file was generated from `{src.relative_to(ROOT)}`.\n\n"
        )
        dst.write_text(header + _replace_template(content, asset), encoding="utf-8")

    generated_files = [out_dir / "SKILL.md", *templates.values()]
    forbidden = ["<token>", "<SYMBOL>", "<symbol>", "<name>", "<maxHolders>", "<maxBalancePerInvestor>"]
    leftovers = []
    for path in generated_files:
        text = path.read_text(encoding="utf-8")
        leftovers.extend(f"{path}: {marker}" for marker in forbidden if marker in text)
    if leftovers:
        raise SystemExit("Unreplaced placeholders remain:\n" + "\n".join(leftovers))

    state = {}
    if STATE.exists():
        state = json.loads(STATE.read_text())
    state["spawned_skill"] = {
        "generated": True,
        "path": str(out_dir.relative_to(ROOT)) + "/",
        "generated_at": _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    }
    state["last_action"] = "spawn_asset_skill"
    state.setdefault("history", []).append(
        {
            "action": "spawn_asset_skill",
            "risk": "low",
            "confirmed_by_human": False,
            "at": state["spawned_skill"]["generated_at"],
        }
    )
    STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")

    print(f"Generated {out_dir.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
