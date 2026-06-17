#!/usr/bin/env python3
"""Refine a spawned asset skill from state.personalization (incremental evolution)."""

from __future__ import annotations

import argparse

from skill_spawn_lib import (
    archive_version,
    bump_meta,
    load_asset,
    load_state,
    record_history,
    skill_dir_for,
    utc_now,
    write_preferences,
    write_state,
    ROOT,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Refine spawned skill from personalization state")
    parser.add_argument(
        "--force",
        action="store_true",
        help="Refine even when personalization is empty (writes placeholder PREFERENCES.md)",
    )
    args = parser.parse_args()

    asset = load_asset()
    out_dir = skill_dir_for(asset)
    if not (out_dir / "SKILL.md").exists():
        raise SystemExit(f"No spawned skill at {out_dir}. Run npm run spawn:asset first.")

    state = load_state()
    personalization = state.get("personalization") or {}
    prefs = personalization.get("preferences") or {}

    if not personalization and not args.force:
        raise SystemExit(
            "state.personalization is empty. Record preferences (with deposit consent) "
            "or pass --force for a placeholder PREFERENCES.md."
        )

    archive_version(out_dir, "pre-refine-personalization")
    personalization.setdefault("refined_at", utc_now())
    write_preferences(asset, out_dir, personalization)

    changes = [key for key in prefs.keys()] or ["placeholder"]
    meta = bump_meta(
        out_dir,
        asset,
        "refine",
        f"personalization keys: {', '.join(changes)}",
    )

    skill_rel = str(out_dir.relative_to(ROOT)) + "/"
    spawned = state.setdefault("spawned_skill", {})
    spawned.update(
        {
            "generated": True,
            "path": skill_rel,
            "refined_at": personalization["refined_at"],
            "version": meta["version"],
        }
    )
    state["personalization"] = personalization
    record_history(state, "refine_asset_skill")
    write_state(state)

    print(f"Refined {skill_rel} → version {meta['version']}")
    print(f"  PREFERENCES.md updated ({len(changes)} preference key(s))")
    print("  Archived previous snapshot under versions/")


if __name__ == "__main__":
    main()
