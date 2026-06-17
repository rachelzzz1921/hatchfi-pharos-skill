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
> **Private by default — serves its owner first.** Sharing scope is declared in `PERMISSIONS.md`;
> the owner's data (investor PII, diligence evidence, dividends, preferences) is NOT in this package.

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


def _write_permission_manifest(asset: dict, out_dir: Path) -> None:
    """Declare the sharing boundary: what this skill exposes vs what stays private.

    The spawned skill is private-by-default and serves its owner first. It bundles
    ONLY the public operating surface (contract address + operation playbooks). The
    owner's sovereign ledger (state.json: investor PII, diligence evidence, dividend
    detail, personalization) is NEVER copied here — sharing a skill != sharing data.
    """
    symbol = asset["symbol"]
    (out_dir / "PERMISSIONS.md").write_text(
        f"""# Permission Manifest · {symbol} Asset Skill

> Sharing status: **private** (serves the owner first).
> Opening this skill to anyone else is an explicit, scoped opt-in — record it in
> the parent `state.json` → `consent.shares` before distributing.

## Exposed (public operating surface)

- Contract address: `{asset['address']}`
- Operation commands & references (whitelist check, mint, transfer-check, dividends, diligence)
- Public compliance constants: MAX_HOLDERS={asset['max_holders']}, MAX_BALANCE_PER_INVESTOR={asset['max_balance']}

## Withheld (owner's sovereign data — never bundled)

- Investor identities / PII (`state.whitelist`)
- Diligence evidence (`state.diligence.evidence`)
- Dividend distribution detail (`state.dividends`)
- Personalization preferences & templates (`state.personalization`)

These remain in the owner's local `state.json` (gitignored) and are only referenced
by path at runtime. **Sharing this skill does not share the data above.**
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
    _write_permission_manifest(asset, out_dir)

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

    now = _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest_rel = str((out_dir / "PERMISSIONS.md").relative_to(ROOT))
    skill_rel = str(out_dir.relative_to(ROOT)) + "/"

    state = {}
    if STATE.exists():
        state = json.loads(STATE.read_text())
    state.setdefault("ownership", {}).setdefault("private_by_default", True)
    state["ownership"].setdefault(
        "notice",
        "state.json holds investor PII, diligence evidence and personalization — "
        "owner-private. Sharing any skill/data requires explicit consent (consent.shares).",
    )
    state["spawned_skill"] = {
        "generated": True,
        "path": skill_rel,
        "generated_at": now,
        "sharing": "private",
        "permission_manifest": manifest_rel,
    }
    # Record the sharing decision as NOT-yet-granted: the skill is private until the
    # owner explicitly consents to open it (with the exposed/withheld manifest).
    state.setdefault("consent", {}).setdefault("shares", []).append(
        {
            "artifact": skill_rel,
            "granted": False,
            "exposed": ["contract_address", "operation_commands", "public_compliance_constants"],
            "withheld": ["investor_pii", "diligence_evidence", "dividend_detail", "personalization"],
            "at": now,
        }
    )
    state["last_action"] = "spawn_asset_skill"
    state.setdefault("history", []).append(
        {
            "action": "spawn_asset_skill",
            "risk": "low",
            "confirmed_by_human": False,
            "at": now,
        }
    )
    STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")

    print(f"Generated {skill_rel} (private-by-default)")
    print(f"  Permission manifest: {manifest_rel}")
    print("  This skill serves YOU first. It is private until you explicitly consent")
    print("  to share it (see PERMISSIONS.md + state.consent.shares). Sharing the skill")
    print("  does NOT share your state.json (investor PII / diligence / dividends).")


if __name__ == "__main__":
    main()
