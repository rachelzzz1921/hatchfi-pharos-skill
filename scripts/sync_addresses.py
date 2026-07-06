#!/usr/bin/env python3
"""
Sync every submission-surface reference from an OLD contract address/tx to a NEW one.

Use after a redeploy: the deploy scripts update deployments/*.json + state.json, but the
README / dashboard / SKILL / docs / deck / MPF-asset still cite the previous address. This
rewrites them in one pass (full address, `0x1234…abcd` abbreviations, and deploy/smoke txs),
then reminds you to respawn the MPF-asset sub-skill.

    python3 scripts/sync_addresses.py --old 0x975704…b5c3 --new 0x<new-token> \
        [--old-deploy-tx 0x… --new-deploy-tx 0x…] [--old-smoke-tx 0x… --new-smoke-tx 0x…] \
        [--dry-run]

If --new is omitted it is read from deployments/pharos.json.contractAddress.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

SUBMISSION_FILES = [
    "README.md", "README.zh.md", "SKILL.md", "SUBMISSION_DASHBOARD.html",
    "deployments.json", "deployments/pharos.example.json", "state.example.json",
    "docs/ARCHITECTURE.md", "docs/COMPLETED_VALIDATION.md", "docs/PHAROS_VISION.md",
    "docs/QUICKSTART.md", "docs/SUBMISSION.md", "docs/WORKED_EXAMPLE.md",
    "docs/diligence/CHANGELOG.md", "docs/diligence-attestation-protocol.md",
    "docs/JUDGE_MANUAL.md", "docs/SECURITY.md",
    "docs/deck/index.html", "docs/deck/index.zh.html",
    "scripts/smoke_attestation.sh",
    "skills/MPF-asset/README.md",
    "web/landing.html", "web/src/App.tsx",
    "mcp-server/onchain-tools.ts",
]


def abbr(addr: str) -> str:
    return f"{addr[:6]}…{addr[-4:]}"


def abbr_tx(tx: str) -> str:
    return f"{tx[:8]}…{tx[-4:]}"


def build_subs(args) -> list[tuple[str, str]]:
    subs: list[tuple[str, str]] = []
    old, new = args.old, args.new
    # full address, case-insensitive, both directions of checksum
    subs.append((old.lower(), new.lower()))
    subs.append((old, new))
    # abbreviations
    subs.append((abbr(old), abbr(new)))
    subs.append((f"{old[:6]}…{old[-4:]}", abbr(new)))
    if args.old_deploy_tx and args.new_deploy_tx:
        subs.append((args.old_deploy_tx, args.new_deploy_tx))
        subs.append((abbr_tx(args.old_deploy_tx), abbr_tx(args.new_deploy_tx)))
    if args.old_smoke_tx and args.new_smoke_tx:
        subs.append((args.old_smoke_tx, args.new_smoke_tx))
        subs.append((abbr_tx(args.old_smoke_tx), abbr_tx(args.new_smoke_tx)))
    return subs


def main() -> None:
    p = argparse.ArgumentParser(description="Sync contract address/tx references after redeploy")
    p.add_argument("--old", required=True, help="old token address (0x...)")
    p.add_argument("--new", help="new token address (default: deployments/pharos.json)")
    p.add_argument("--old-deploy-tx")
    p.add_argument("--new-deploy-tx")
    p.add_argument("--old-smoke-tx")
    p.add_argument("--new-smoke-tx")
    p.add_argument("--dry-run", action="store_true")
    args = p.parse_args()

    if not args.new:
        dep = json.loads((ROOT / "deployments/pharos.json").read_text())
        args.new = dep["contractAddress"]
        print(f"new token (from deployments/pharos.json): {args.new}")

    subs = build_subs(args)
    total = 0
    old_lower = re.compile(re.escape(args.old), re.IGNORECASE)
    for rel in SUBMISSION_FILES:
        fp = ROOT / rel
        if not fp.exists():
            continue
        t = fp.read_text(encoding="utf-8")
        orig = t
        n = len(old_lower.findall(t))
        t = old_lower.sub(args.new, t)
        for a, b in subs:
            if a in (args.old, args.old.lower()):
                continue  # already handled by regex
            c = t.count(a)
            n += c
            t = t.replace(a, b)
        if t != orig:
            total += n
            if args.dry_run:
                print(f"  [dry] {rel}: {n} refs")
            else:
                fp.write_text(t, encoding="utf-8")
                print(f"  {rel}: {n} refs")
    print(f"\n{'[dry-run] would update' if args.dry_run else 'updated'} {total} references")
    print("\nNext: `npm run spawn:asset` to respawn skills/MPF-asset from the new state,")
    print("then re-run `npm run judge:readiness:strict` and `npm run ui:e2e` to confirm green.")


if __name__ == "__main__":
    main()
