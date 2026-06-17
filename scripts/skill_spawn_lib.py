"""Shared helpers for spawning and evolving asset-specific skills."""

from __future__ import annotations

import datetime as _dt
import json
import re
import shutil
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
STATE = ROOT / "state.json"
DEPLOYMENT = ROOT / "deployments" / "pharos.json"
MAX_VERSIONS = 10

PRIMARY_ARTIFACTS = (
    "SKILL.md",
    "PERMISSIONS.md",
    "PREFERENCES.md",
    "meta.json",
)


def utc_now() -> str:
    return _dt.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def load_state() -> dict:
    if not STATE.exists():
        return {}
    return json.loads(STATE.read_text(encoding="utf-8"))


def write_state(state: dict) -> None:
    STATE.write_text(json.dumps(state, indent=2) + "\n", encoding="utf-8")


def load_asset() -> dict:
    state = load_state()
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
        dep = json.loads(DEPLOYMENT.read_text(encoding="utf-8"))
        args = dep.get("constructorArgs", {})
        return {
            "address": dep["contractAddress"],
            "name": args.get("name", "Manhattan Property Fund"),
            "symbol": args.get("symbol", "MPF"),
            "max_holders": args.get("maxHolders", 100),
            "max_balance": args.get("maxBalancePerInvestor", "1000000000000000000000000"),
        }

    raise SystemExit("No deployed asset found. Run npm run deploy:pharos first.")


def safe_symbol(symbol: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9_-]", "-", symbol.strip())
    if not cleaned:
        raise SystemExit("Invalid asset symbol")
    return cleaned


def skill_dir_for(asset: dict) -> Path:
    return ROOT / "skills" / f"{safe_symbol(asset['symbol'])}-asset"


def replace_template(text: str, asset: dict) -> str:
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


def read_meta(skill_dir: Path) -> dict:
    meta_path = skill_dir / "meta.json"
    if not meta_path.exists():
        return {}
    return json.loads(meta_path.read_text(encoding="utf-8"))


def write_meta(skill_dir: Path, meta: dict) -> None:
    (skill_dir / "meta.json").write_text(
        json.dumps(meta, indent=2) + "\n",
        encoding="utf-8",
    )


def archive_version(skill_dir: Path, reason: str) -> str | None:
    """Archive current artifacts before spawn/refine. Returns archive id or None."""
    if not (skill_dir / "SKILL.md").exists():
        return None

    archive_id = utc_now().replace(":", "-")
    archive_dir = skill_dir / "versions" / archive_id
    archive_dir.mkdir(parents=True, exist_ok=True)

    for name in PRIMARY_ARTIFACTS:
        src = skill_dir / name
        if src.exists():
            shutil.copy2(src, archive_dir / name)

    refs_src = skill_dir / "references"
    if refs_src.exists():
        shutil.copytree(refs_src, archive_dir / "references", dirs_exist_ok=True)

    (archive_dir / "archive_reason.json").write_text(
        json.dumps({"reason": reason, "at": utc_now()}, indent=2) + "\n",
        encoding="utf-8",
    )

    versions_root = skill_dir / "versions"
    version_dirs = sorted(
        [p for p in versions_root.iterdir() if p.is_dir()],
        key=lambda p: p.stat().st_mtime,
    )
    while len(version_dirs) > MAX_VERSIONS:
        oldest = version_dirs.pop(0)
        shutil.rmtree(oldest)

    return archive_id


def list_versions(skill_dir: Path) -> list[dict[str, Any]]:
    versions_dir = skill_dir / "versions"
    if not versions_dir.exists():
        return []

    rows: list[dict[str, Any]] = []
    for version_dir in sorted(versions_dir.iterdir()):
        if not version_dir.is_dir():
            continue
        reason_path = version_dir / "archive_reason.json"
        reason = {}
        if reason_path.exists():
            reason = json.loads(reason_path.read_text(encoding="utf-8"))
        files = [item.name for item in version_dir.iterdir() if item.is_file()]
        rows.append(
            {
                "id": version_dir.name,
                "archived_at": reason.get("at"),
                "reason": reason.get("reason"),
                "files": files,
                "path": str(version_dir.relative_to(ROOT)),
            }
        )
    return rows


def rollback(skill_dir: Path, version_id: str) -> None:
    version_dir = skill_dir / "versions" / version_id
    if not version_dir.exists():
        raise SystemExit(f"Version not found: {version_id}")

    archive_version(skill_dir, f"pre-rollback-to-{version_id}")

    for name in PRIMARY_ARTIFACTS:
        src = version_dir / name
        if src.exists():
            shutil.copy2(src, skill_dir / name)

    refs_src = version_dir / "references"
    if refs_src.exists():
        refs_dst = skill_dir / "references"
        if refs_dst.exists():
            shutil.rmtree(refs_dst)
        shutil.copytree(refs_src, refs_dst)

    meta = read_meta(skill_dir)
    meta["rollback_from"] = version_id
    meta["rollback_at"] = utc_now()
    write_meta(skill_dir, meta)


def write_skill(asset: dict, out_dir: Path) -> None:
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
> Owner-specific defaults (if refined) live in `PREFERENCES.md` — local, never bundled when sharing.

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
| Apply owner defaults before operations | read `PREFERENCES.md` | low | `PREFERENCES.md` |

## Asset Constants

- `TOKEN={asset['address']}`
- `SYMBOL={symbol}`
- `NAME={asset['name']}`
- `MAX_HOLDERS={asset['max_holders']}`
- `MAX_BALANCE_PER_INVESTOR={asset['max_balance']}`
""",
        encoding="utf-8",
    )


def write_permission_manifest(asset: dict, out_dir: Path) -> None:
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
- Owner preference overlay (`PREFERENCES.md` in this directory — withheld on share)

These remain in the owner's local `state.json` (gitignored) and are only referenced
by path at runtime. **Sharing this skill does not share the data above.**
""",
        encoding="utf-8",
    )


def format_preferences_md(asset: dict, personalization: dict) -> str:
    prefs = personalization.get("preferences") or {}
    refined_at = personalization.get("refined_at") or utc_now()
    symbol = asset["symbol"]

    lines = [
        f"# Owner Preferences · {symbol}",
        "",
        "> **Private overlay** — distilled from issuer conversations into parent `state.personalization`.",
        "> Not copied when sharing this skill. Agent should read these defaults before mint,",
        "> whitelist, or dividend operations, then confirm deltas with the owner.",
        "",
        f"Last refined: `{refined_at}`",
        "",
    ]

    if prefs.get("jurisdictions"):
        codes = ", ".join(str(c) for c in prefs["jurisdictions"])
        lines.append(f"- **Default jurisdictions (ISO 3166)**: {codes}")
    if prefs.get("default_max_holders") is not None:
        lines.append(f"- **Default max holders (next issuance)**: {prefs['default_max_holders']}")
    if prefs.get("default_max_balance_per_investor"):
        lines.append(
            f"- **Default max balance per investor (next issuance)**: "
            f"`{prefs['default_max_balance_per_investor']}`"
        )
    if prefs.get("dividend_cadence"):
        lines.append(f"- **Dividend cadence**: {prefs['dividend_cadence']}")
    if prefs.get("disclosure_template"):
        lines.append(f"- **Disclosure template**: {prefs['disclosure_template']}")
    if prefs.get("risk_thresholds"):
        lines.append("- **Custom risk thresholds**:")
        for key, value in prefs["risk_thresholds"].items():
            lines.append(f"  - `{key}`: {value}")

    if len(lines) <= 6:
        lines.extend(
            [
                "",
                "_No personalization recorded yet. Run `npm run refine:asset` after updating_",
                "`state.personalization` (with deposit consent).",
            ]
        )

    refine_log = personalization.get("refine_log") or []
    if refine_log:
        lines.extend(["", "## Refine history (audit trail)", ""])
        for entry in refine_log[-5:]:
            change = entry.get("change", "preference update")
            at = entry.get("at", "")
            consented = entry.get("consented", False)
            lines.append(f"- `{at}` — {change} (consented={consented})")

    lines.append("")
    return "\n".join(lines)


def write_preferences(asset: dict, out_dir: Path, personalization: dict) -> bool:
    """Write PREFERENCES.md when personalization exists. Returns True if written."""
    if not personalization:
        return False
    content = format_preferences_md(asset, personalization)
    (out_dir / "PREFERENCES.md").write_text(content, encoding="utf-8")
    return True


def write_reference_templates(asset: dict, out_dir: Path) -> list[Path]:
    symbol = asset["symbol"]
    refs_dir = out_dir / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)

    templates = {
        ROOT / "references" / "onchain-diligence.md": refs_dir / f"{symbol}-diligence.md",
        ROOT / "references" / "rwa-issuance.md": refs_dir / f"{symbol}-issuance.md",
        ROOT / "references" / "rwa-dividend.md": refs_dir / f"{symbol}-dividend.md",
    }
    generated: list[Path] = []
    for src, dst in templates.items():
        content = src.read_text(encoding="utf-8")
        header = (
            f"# {symbol}-bound reference\n\n"
            f"> Asset: `{asset['name']}` (`{symbol}`)\n"
            f"> Token: `{asset['address']}`\n"
            f"> This file was generated from `{src.relative_to(ROOT)}`.\n\n"
        )
        dst.write_text(header + replace_template(content, asset), encoding="utf-8")
        generated.append(dst)

    surface_src = ROOT / "references" / "generated" / "contract-surface.md"
    if surface_src.exists():
        surface_dst = refs_dir / f"{symbol}-contract-surface.md"
        surface_header = (
            f"# {symbol} contract surface (auto-generated)\n\n"
            f"> Token: `{asset['address']}`\n"
            f"> Synced from `references/generated/contract-surface.md`.\n\n"
        )
        body = surface_src.read_text(encoding="utf-8")
        if body.startswith("# Auto-generated"):
            body = body.split("\n", 1)[1] if "\n" in body else body
        body = replace_template(body.lstrip(), asset)
        surface_dst.write_text(surface_header + body, encoding="utf-8")
        generated.append(surface_dst)

    return generated


def validate_no_placeholders(paths: list[Path]) -> None:
    forbidden = [
        "<token>",
        "<SYMBOL>",
        "<symbol>",
        "<name>",
        "<maxHolders>",
        "<maxBalancePerInvestor>",
    ]
    leftovers: list[str] = []
    for path in paths:
        text = path.read_text(encoding="utf-8")
        leftovers.extend(f"{path}: {marker}" for marker in forbidden if marker in text)
    if leftovers:
        raise SystemExit("Unreplaced placeholders remain:\n" + "\n".join(leftovers))


def bump_meta(
    skill_dir: Path,
    asset: dict,
    action: str,
    detail: str | None = None,
) -> dict:
    meta = read_meta(skill_dir)
    version = int(meta.get("version") or 0) + 1
    now = utc_now()
    evolution = list(meta.get("evolution") or [])
    evolution.append(
        {
            "action": action,
            "at": now,
            "version": version,
            "detail": detail,
        }
    )
    meta.update(
        {
            "symbol": asset["symbol"],
            "contract": asset["address"],
            "version": version,
            "updated_at": now,
            "evolution": evolution,
        }
    )
    if action == "spawn":
        meta["spawned_at"] = now
    if action == "refine":
        meta["refined_at"] = now
    write_meta(skill_dir, meta)
    return meta


def upsert_spawn_consent(state: dict, skill_rel: str, manifest_rel: str, now: str) -> None:
    shares = state.setdefault("consent", {}).setdefault("shares", [])
    for entry in shares:
        if entry.get("artifact") == skill_rel:
            entry.setdefault("exposed", ["contract_address", "operation_commands", "public_compliance_constants"])
            entry.setdefault(
                "withheld",
                [
                    "investor_pii",
                    "diligence_evidence",
                    "dividend_detail",
                    "personalization",
                    "preferences_overlay",
                ],
            )
            return

    shares.append(
        {
            "artifact": skill_rel,
            "granted": False,
            "exposed": ["contract_address", "operation_commands", "public_compliance_constants"],
            "withheld": [
                "investor_pii",
                "diligence_evidence",
                "dividend_detail",
                "personalization",
                "preferences_overlay",
            ],
            "at": now,
        }
    )


def record_history(state: dict, action: str, risk: str = "low") -> None:
    now = utc_now()
    state["last_action"] = action
    state.setdefault("history", []).append(
        {
            "action": action,
            "risk": risk,
            "confirmed_by_human": False,
            "at": now,
        }
    )
