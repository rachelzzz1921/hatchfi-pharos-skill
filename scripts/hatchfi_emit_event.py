#!/usr/bin/env python3
"""Append one HatchFi agent run event (NDJSON) for institutional observability.

Harness scripts call this after each gated step. Events land in:
  .hatchfi/run-events.jsonl   — append-only audit trail (UI polls this)
  .hatchfi/run-latest.json    — last event snapshot

When state.json exists, mirrors into state.progress[] + state.run_session.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EVENTS_DIR = ROOT / ".hatchfi"
EVENTS_FILE = EVENTS_DIR / "run-events.jsonl"
LATEST_FILE = EVENTS_DIR / "run-latest.json"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def emit(
    phase: str,
    step: str,
    status: str,
    summary: str,
    *,
    tx: str | None = None,
    address: str | None = None,
    evidence: str | None = None,
    extra: dict | None = None,
) -> dict:
    event: dict = {
        "ts": utc_now(),
        "phase": phase,
        "step": step,
        "status": status,
        "summary": summary,
    }
    if tx:
        event["tx"] = tx
    if address:
        event["address"] = address
    if evidence:
        event["evidence"] = evidence
    if extra:
        event.update(extra)

    EVENTS_DIR.mkdir(exist_ok=True)
    with EVENTS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(event, ensure_ascii=False) + "\n")
    LATEST_FILE.write_text(json.dumps(event, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    _mirror_progress(event)
    return event


def _mirror_progress(event: dict) -> None:
    state_path = ROOT / "state.json"
    if not state_path.exists():
        return
    try:
        state = json.loads(state_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        return

    entry = {
        "at": event["ts"],
        "phase": event["phase"],
        "step": event["step"],
        "status": event["status"],
        "summary": event["summary"],
    }
    for key in ("tx", "address", "evidence"):
        if key in event:
            entry[key] = event[key]

    state.setdefault("progress", []).append(entry)
    state["run_session"] = {
        "last_event_at": event["ts"],
        "last_step": event["step"],
        "last_status": event["status"],
        "last_phase": event["phase"],
    }
    state_path.write_text(json.dumps(state, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description="Emit one HatchFi agent run event")
    parser.add_argument("--phase", required=True, choices=["A", "B", "C", "D", "E"])
    parser.add_argument("--step", required=True)
    parser.add_argument("--status", required=True, choices=["ok", "fail", "skip", "running", "warn"])
    parser.add_argument("--summary", required=True)
    parser.add_argument("--tx")
    parser.add_argument("--address")
    parser.add_argument("--evidence")
    parser.add_argument("--extra", help="JSON object merged into the event")
    args = parser.parse_args()

    extra = json.loads(args.extra) if args.extra else None
    emit(
        args.phase,
        args.step,
        args.status,
        args.summary,
        tx=args.tx,
        address=args.address,
        evidence=args.evidence,
        extra=extra,
    )
    print(f"hatchfi_event: {args.step} → {args.status}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
