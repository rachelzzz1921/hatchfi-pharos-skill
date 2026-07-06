#!/usr/bin/env python3
"""Seed institutional demo run-events (no chain / no private key).

Writes .hatchfi/run-events.jsonl and copies to web/public/run-events.jsonl for the
Agent Run dashboard. Safe to commit the example; live runs append to the local file.
"""
from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXAMPLE = ROOT / ".hatchfi" / "run-events.example.jsonl"
OUT = ROOT / ".hatchfi" / "run-events.jsonl"
WEB_PUBLIC = ROOT / "web" / "public" / "run-events.jsonl"

DEMO_EVENTS = [
    {
        "ts": "2026-07-06T01:00:00Z",
        "phase": "A",
        "step": "diligence:screen",
        "status": "ok",
        "summary": "Stage 0–2 complete · target GREEN · OFAC 93-address snapshot",
        "evidence": "0x037f2c541c4ee272c7de1f54b68cfe08b35b5d9e104bb4c308dffd5bec66c88c",
    },
    {
        "ts": "2026-07-06T01:05:00Z",
        "phase": "A",
        "step": "diligence:attest",
        "status": "ok",
        "summary": "On-chain attestation recorded (hash-only, no PII)",
        "address": "0x0d21aED2e3d4c64B2e0Df556C7514b80CC4AB94F",
    },
    {
        "ts": "2026-07-06T01:12:00Z",
        "phase": "B",
        "step": "preflight:pharos",
        "status": "ok",
        "summary": "Atlantic chainId 688689 · deploy wallet balance sufficient",
    },
    {
        "ts": "2026-07-06T01:18:00Z",
        "phase": "B",
        "step": "deploy:pharos",
        "status": "ok",
        "summary": "CompliantRWAToken deployed · Manhattan Property Fund (MPF)",
        "address": "0x975704ca2182b3fc64fd82ad2c01d8ec5be0b5c3",
        "tx": "0xd00bcc18e78f85eaa9f62ee907a6adac13c9a45f6f7266699e57487beb61a023",
    },
    {
        "ts": "2026-07-06T01:22:00Z",
        "phase": "B",
        "step": "smoke:pharos",
        "status": "ok",
        "summary": "registerIdentity + mint 1 MPF · receipt status==1",
        "tx": "0x1b212771313c0ad0b382f99c69c027bdd5265e0cc64b619792adbd9038063905",
    },
    {
        "ts": "2026-07-06T01:28:00Z",
        "phase": "C",
        "step": "lifecycle:register",
        "status": "ok",
        "summary": "Investor whitelisted · jurisdiction US (840)",
    },
    {
        "ts": "2026-07-06T01:35:00Z",
        "phase": "D",
        "step": "spawn:asset",
        "status": "ok",
        "summary": "Private operating skill materialized · skills/MPF-asset v9",
        "evidence": "skills/MPF-asset/SKILL.md",
    },
    {
        "ts": "2026-07-06T01:40:00Z",
        "phase": "E",
        "step": "eval:skill",
        "status": "ok",
        "summary": "Deterministic behavioral eval · 64/64 passed",
    },
    {
        "ts": "2026-07-06T01:42:00Z",
        "phase": "E",
        "step": "inspect:skill",
        "status": "ok",
        "summary": "Skill Inspector static gate · 0 critical / 0 high",
    },
    {
        "ts": "2026-07-06T01:45:00Z",
        "phase": "E",
        "step": "judge:readiness:strict",
        "status": "ok",
        "summary": "Atlantic readiness · 6/6 checks (token + OFAC oracle live)",
    },
]


def write_events(events: list[dict], dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    lines = [json.dumps(e, ensure_ascii=False) for e in events]
    dest.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--from-example",
        action="store_true",
        help="Copy run-events.example.jsonl instead of built-in demo set",
    )
    parser.add_argument("--sync-web", action="store_true", help="Also copy to web/public/run-events.jsonl")
    args = parser.parse_args()

    if args.from_example and EXAMPLE.exists():
        shutil.copy(EXAMPLE, OUT)
    else:
        write_events(DEMO_EVENTS, OUT)
        write_events(DEMO_EVENTS, EXAMPLE)

    WEB_PUBLIC.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy(OUT, WEB_PUBLIC)
    print(f"Synced → {WEB_PUBLIC.relative_to(ROOT)}")

    print(f"Seeded {OUT.relative_to(ROOT)} ({OUT.read_text().count(chr(10))} events)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
