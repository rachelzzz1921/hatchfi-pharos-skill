#!/usr/bin/env python3
"""Canonical diligence evidence hashing — same rules as onchain-attestation.md."""

from __future__ import annotations

import json
import shutil
import subprocess
from typing import Any


def canonicalize_evidence_item(item: dict[str, Any]) -> dict[str, Any]:
    keys = ("check", "cmd", "flag", "infer", "result")
    out = {k: item[k] for k in keys if k in item}
    result = out.get("result")
    if isinstance(result, dict):
        out["result"] = dict(sorted(result.items()))
    return out


def canonicalize_evidence(evidence: list[dict[str, Any]]) -> str:
    items = [canonicalize_evidence_item(e) for e in sorted(evidence, key=lambda x: str(x.get("check", "")))]
    return json.dumps(items, separators=(",", ":"), ensure_ascii=False)


def asset_fingerprint(asset_id: str, jurisdiction: str, wrapper_type: str) -> str:
    """keccak256(abi.encode(string,string,string)) via cast."""
    cast = shutil.which("cast")
    if not cast:
        raise RuntimeError("cast not found — install Foundry")
    encoded = subprocess.run(
        [cast, "abi-encode", "f(string,string,string)", asset_id, jurisdiction, wrapper_type],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
    return subprocess.run(
        [cast, "keccak", encoded],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()


def evidence_hash(evidence: list[dict[str, Any]]) -> str:
    payload = canonicalize_evidence(evidence)
    cast = shutil.which("cast")
    if not cast:
        raise RuntimeError("cast not found — install Foundry")
    return subprocess.run(
        [cast, "keccak", payload],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.strip()
