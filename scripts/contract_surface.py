"""Parse CompliantRWAToken surface and map agent risk tiers."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

RiskTier = Literal["low", "medium", "high"]

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOL = ROOT / "src" / "CompliantRWAToken.sol"

PUBLIC_VAR_RE = re.compile(
    r"(?:uint\d+|bool|address|uint16|uint256)\s+public\s+(\w+)",
    re.MULTILINE,
)
FUNC_RE = re.compile(
    r"function\s+(\w+)\s*\(([^)]*)\)\s*([^{;]+)",
    re.MULTILINE,
)
EVENT_RE = re.compile(r"event\s+(\w+)\s*\(([^)]*)\)")
ERROR_RE = re.compile(r"error\s+(\w+)\s*\(([^)]*)\)")

# Agent risk tiers — aligned with SKILL.md capability index
RISK_BY_NAME: dict[str, RiskTier] = {
    "registerIdentity": "medium",
    "batchRegisterIdentity": "medium",
    "removeIdentity": "medium",
    "isVerified": "low",
    "investorCountry": "low",
    "setComplianceRules": "medium",
    "canTransfer": "low",
    "setAddressFrozen": "medium",
    "freezePartialTokens": "medium",
    "unfreezePartialTokens": "medium",
    "isFrozen": "low",
    "frozenTokens": "low",
    "mint": "high",
    "burn": "high",
    "forcedTransfer": "high",
    "recoveryAddress": "high",
    "depositDividend": "high",
    "sweepUndistributedDividend": "high",
    "claimDividend": "low",
    "dividendOf": "low",
    "addAgent": "medium",
    "removeAgent": "medium",
    "isAgent": "low",
    "pause": "medium",
    "unpause": "medium",
    "holderCount": "low",
    "maxHolders": "low",
    "maxBalancePerInvestor": "low",
    "dividendPerShareCumulative": "low",
    "withdrawableDividend": "low",
    "undistributedDividend": "low",
}

CAST_HINTS: dict[str, str] = {
    "registerIdentity": "cast send <token> \"registerIdentity(address,uint16)\" <investor> <country> --rpc-url $RPC --private-key $PK",
    "batchRegisterIdentity": "cast send <token> \"batchRegisterIdentity(address[],uint16[])\" \"[<a1>]\" \"[<c1>]\" --rpc-url $RPC --private-key $PK",
    "removeIdentity": "cast send <token> \"removeIdentity(address)\" <investor> --rpc-url $RPC --private-key $PK",
    "isVerified": "cast call <token> \"isVerified(address)(bool)\" <account> --rpc-url $RPC",
    "investorCountry": "cast call <token> \"investorCountry(address)(uint16)\" <account> --rpc-url $RPC",
    "setComplianceRules": "cast send <token> \"setComplianceRules(uint256,uint256)\" $MAX_HOLDERS $MAX_BALANCE --rpc-url $RPC --private-key $PK",
    "canTransfer": "cast call <token> \"canTransfer(address,address,uint256)(bool,string)\" <from> <to> <amt> --rpc-url $RPC",
    "setAddressFrozen": "cast send <token> \"setAddressFrozen(address,bool)\" <account> true --rpc-url $RPC --private-key $PK",
    "freezePartialTokens": "cast send <token> \"freezePartialTokens(address,uint256)\" <account> <amount> --rpc-url $RPC --private-key $PK",
    "unfreezePartialTokens": "cast send <token> \"unfreezePartialTokens(address,uint256)\" <account> <amount> --rpc-url $RPC --private-key $PK",
    "isFrozen": "cast call <token> \"isFrozen(address)(bool)\" <account> --rpc-url $RPC",
    "frozenTokens": "cast call <token> \"frozenTokens(address)(uint256)\" <account> --rpc-url $RPC",
    "mint": "cast send <token> \"mint(address,uint256)\" <to> <amount> --rpc-url $RPC --private-key $PK",
    "burn": "cast send <token> \"burn(address,uint256)\" <from> <amount> --rpc-url $RPC --private-key $PK",
    "forcedTransfer": "cast send <token> \"forcedTransfer(address,address,uint256)\" <from> <to> <amount> --rpc-url $RPC --private-key $PK",
    "recoveryAddress": "cast send <token> \"recoveryAddress(address,address)\" <lost> <new> --rpc-url $RPC --private-key $PK",
    "depositDividend": "cast send <token> \"depositDividend()\" --value <PHRS> --rpc-url $RPC --private-key $PK",
    "sweepUndistributedDividend": "cast send <token> \"sweepUndistributedDividend(address)\" <to> --rpc-url $RPC --private-key $PK",
    "claimDividend": "cast send <token> \"claimDividend()\" --rpc-url $RPC --private-key $PK",
    "dividendOf": "cast call <token> \"dividendOf(address)(uint256)\" <holder> --rpc-url $RPC",
    "addAgent": "cast send <token> \"addAgent(address)\" <agent> --rpc-url $RPC --private-key $PK",
    "removeAgent": "cast send <token> \"removeAgent(address)\" <agent> --rpc-url $RPC --private-key $PK",
    "isAgent": "cast call <token> \"isAgent(address)(bool)\" <account> --rpc-url $RPC",
    "pause": "cast send <token> \"pause()\" --rpc-url $RPC --private-key $PK",
    "unpause": "cast send <token> \"unpause()\" --rpc-url $RPC --private-key $PK",
    "holderCount": "cast call <token> \"holderCount()(uint256)\" --rpc-url $RPC",
    "maxHolders": "cast call <token> \"maxHolders()(uint256)\" --rpc-url $RPC",
    "maxBalancePerInvestor": "cast call <token> \"maxBalancePerInvestor()(uint256)\" --rpc-url $RPC",
    "undistributedDividend": "cast call <token> \"undistributedDividend()(uint256)\" --rpc-url $RPC",
}


@dataclass
class FunctionSurface:
    name: str
    params: str
    modifiers: str
    risk: RiskTier
    mutability: str
    cast_hint: str

    @property
    def is_view(self) -> bool:
        return "view" in self.modifiers or "pure" in self.modifiers

    @property
    def signature(self) -> str:
        return f"{self.name}({self.params})"


def _normalize_params(raw: str) -> str:
    parts = [p.strip() for p in raw.split(",") if p.strip()]
    cleaned: list[str] = []
    for part in parts:
        tokens = part.split()
        if not tokens:
            continue
        cleaned.append(tokens[0])
    return ",".join(cleaned)


def _infer_risk(name: str, modifiers: str, is_view: bool) -> RiskTier:
    if name in RISK_BY_NAME:
        return RISK_BY_NAME[name]
    if is_view:
        return "low"
    if "onlyOwner" in modifiers or "onlyAgent" in modifiers:
        return "medium"
    return "medium"


def parse_contract(sol_path: Path = DEFAULT_SOL) -> dict:
    text = sol_path.read_text(encoding="utf-8")

    functions: list[FunctionSurface] = []
    seen: set[str] = set()

    for match in FUNC_RE.finditer(text):
        name, params_raw, tail = match.group(1), match.group(2), match.group(3)
        if name.startswith("_"):
            continue
        if "internal" in tail and "external" not in tail and "public" not in tail:
            continue
        if name in seen:
            continue
        seen.add(name)

        params = _normalize_params(params_raw)
        modifiers = tail.strip()
        is_view = "view" in modifiers or "pure" in modifiers
        risk = _infer_risk(name, modifiers, is_view)
        mutability = "view" if is_view else ("payable" if "payable" in modifiers else "write")
        hint = CAST_HINTS.get(name, f"see references/rwa-issuance.md#{name}")

        functions.append(
            FunctionSurface(
                name=name,
                params=params,
                modifiers=modifiers,
                risk=risk,
                mutability=mutability,
                cast_hint=hint,
            )
        )

    for match in PUBLIC_VAR_RE.finditer(text):
        name = match.group(1)
        if name in seen or name.startswith("_"):
            continue
        seen.add(name)
        risk = RISK_BY_NAME.get(name, "low")
        hint = CAST_HINTS.get(name, f"cast call <token> \"{name}()(...)\" --rpc-url $RPC")
        functions.append(
            FunctionSurface(
                name=name,
                params="",
                modifiers="public state variable",
                risk=risk,
                mutability="view",
                cast_hint=hint,
            )
        )

    events = [{"name": m.group(1), "params": m.group(2).strip()} for m in EVENT_RE.finditer(text)]
    errors = [{"name": m.group(1), "params": m.group(2).strip()} for m in ERROR_RE.finditer(text)]

    return {
        "source": str(sol_path.relative_to(ROOT)),
        "functions": [f.__dict__ for f in functions],
        "events": events,
        "errors": errors,
        "counts": {
            "functions": len(functions),
            "events": len(events),
            "errors": len(errors),
        },
    }


def external_function_names(surface: dict | None = None) -> set[str]:
    data = surface or parse_contract()
    return {f["name"] for f in data["functions"]}


def format_markdown(surface: dict) -> str:
    lines = [
        "# Auto-generated contract surface",
        "",
        f"> Source: `{surface['source']}` — **do not edit by hand**.",
        "> Regenerate: `npm run refs:generate`",
        "",
        f"Counts: {surface['counts']['functions']} external/public functions · "
        f"{surface['counts']['events']} events · {surface['counts']['errors']} errors",
        "",
        "## Function index (agent risk tiers)",
        "",
        "| Function | Tier | Mutability | cast hint |",
        "|---|---|---|---|",
    ]

    tier_emoji = {"low": "🟢", "medium": "🟡", "high": "🔴"}
    for fn in surface["functions"]:
        emoji = tier_emoji.get(fn["risk"], "🟡")
        sig = f"{fn['name']}({fn['params']})"
        hint = fn["cast_hint"].replace("|", "\\|")
        lines.append(f"| `{sig}` | {emoji} {fn['risk']} | {fn['mutability']} | `{hint}` |")

    lines.extend(["", "## Events (cast logs)", "", "| Event | Params |", "|---|---|"])
    for ev in surface["events"]:
        lines.append(f"| `{ev['name']}` | `{ev['params']}` |")

    lines.extend(["", "## Custom errors", "", "| Error | Params |", "|---|---|"])
    for err in surface["errors"]:
        lines.append(f"| `{err['name']}` | `{err['params']}` |")

    lines.append("")
    return "\n".join(lines)


def write_generated(surface: dict, out_dir: Path) -> tuple[Path, Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    json_path = out_dir / "contract-surface.json"
    md_path = out_dir / "contract-surface.md"
    json_path.write_text(json.dumps(surface, indent=2) + "\n", encoding="utf-8")
    md_path.write_text(format_markdown(surface), encoding="utf-8")
    return json_path, md_path


def cheat_sheet_functions(issuance_path: Path) -> set[str]:
    """Extract function names mentioned in rwa-issuance cheat sheet table."""
    if not issuance_path.exists():
        return set()
    text = issuance_path.read_text(encoding="utf-8")
    found: set[str] = set()
    for match in re.finditer(r"\|\s*(\w+)\s*\|\s*`([^`]+)`", text):
        op_name = match.group(1)
        if op_name in RISK_BY_NAME or op_name in {"canTransfer", "holderCount"}:
            found.add(op_name)
    return found


def drift_report(surface: dict, issuance_path: Path) -> list[str]:
    """Return drift messages if manual refs diverge from contract parse."""
    issues: list[str] = []
    parsed = external_function_names(surface)
    manual = cheat_sheet_functions(issuance_path)

    missing_in_manual = sorted(parsed - manual - {"claimDividend", "batchRegisterIdentity", "pause", "unpause"})
    extra_in_manual = sorted(manual - parsed)

    agent_ops = {
        n for n in parsed
        if n not in {"_update", "_beforeBalanceChange", "_afterBalanceChange", "_syncHolder", "_enforceTransfer"}
    }
    for name in sorted(agent_ops):
        if name not in manual and name in {
            "registerIdentity", "mint", "burn", "canTransfer", "setComplianceRules",
            "forcedTransfer", "recoveryAddress", "depositDividend", "dividendOf", "holderCount",
        }:
            issues.append(f"cheat sheet missing core op: {name}")

    if extra_in_manual:
        issues.append(f"cheat sheet mentions unknown ops: {', '.join(extra_in_manual)}")

    return issues
