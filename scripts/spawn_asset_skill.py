#!/usr/bin/env python3
"""Generate an asset-specific skill from deployed CompliantRWAToken state."""

from __future__ import annotations

from skill_spawn_lib import (
    archive_version,
    bump_meta,
    default_compliance_module,
    load_asset,
    load_state,
    record_history,
    skill_dir_for,
    upsert_spawn_consent,
    utc_now,
    validate_no_placeholders,
    write_compliance_module,
    write_permission_manifest,
    write_preferences,
    write_reference_templates,
    write_skill,
    write_state,
    ROOT,
)
from contract_surface import parse_contract, write_generated


def main() -> None:
    asset = load_asset()
    surface = parse_contract()
    write_generated(surface, ROOT / "references" / "generated")

    out_dir = skill_dir_for(asset)
    skill_rel = str(out_dir.relative_to(ROOT)) + "/"
    manifest_rel = str((out_dir / "PERMISSIONS.md").relative_to(ROOT))

    if (out_dir / "SKILL.md").exists():
        archive_version(out_dir, "pre-spawn-regenerate")

    refs_dir = out_dir / "references"
    refs_dir.mkdir(parents=True, exist_ok=True)

    write_skill(asset, out_dir)
    write_permission_manifest(asset, out_dir)

    state = load_state()
    module = default_compliance_module(asset, state)
    write_compliance_module(asset, out_dir, state)
    state.setdefault("asset", {})
    state["asset"]["compliance_module"] = module

    personalization = state.get("personalization") or {}
    if write_preferences(asset, out_dir, personalization):
        print("  Included PREFERENCES.md from state.personalization")

    generated_refs = write_reference_templates(asset, out_dir)
    generated_files = [out_dir / "SKILL.md", *generated_refs]
    validate_no_placeholders(generated_files)

    meta = bump_meta(out_dir, asset, "spawn", "full deterministic regen from parent templates")
    now = utc_now()

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
        "version": meta["version"],
        "evolution_engine": "skill_spawn_lib",
    }
    upsert_spawn_consent(state, skill_rel, manifest_rel, now)
    record_history(state, "spawn_asset_skill")
    write_state(state)

    print(f"Generated {skill_rel} (private-by-default, version {meta['version']})")

    import subprocess

    subprocess.run(
        [
            "python3",
            "scripts/hatchfi_emit_event.py",
            "--phase",
            "D",
            "--step",
            "spawn:asset",
            "--status",
            "ok",
            "--summary",
            f"Private skill {skill_rel} v{meta['version']}",
            "--evidence",
            skill_rel,
        ],
        cwd=ROOT,
        check=False,
        capture_output=True,
    )
    print(f"  Permission manifest: {manifest_rel}")
    print("  Evolve: npm run refine:asset  |  npm run spawn:versions  |  npm run spawn:rollback")


if __name__ == "__main__":
    main()
