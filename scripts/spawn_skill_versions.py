#!/usr/bin/env python3
"""List or rollback version archives for spawned asset skills."""

from __future__ import annotations

import argparse
import json

from skill_spawn_lib import (
    list_versions,
    load_asset,
    rollback,
    skill_dir_for,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage spawned skill version archives")
    sub = parser.add_subparsers(dest="command", required=True)

    sub.add_parser("list", help="List archived versions")

    rollback_parser = sub.add_parser("rollback", help="Rollback to an archived version")
    rollback_parser.add_argument("version_id", help="Archive folder name under versions/")

    args = parser.parse_args()
    asset = load_asset()
    skill_dir = skill_dir_for(asset)

    if args.command == "list":
        rows = list_versions(skill_dir)
        if not rows:
            print(f"No versions archived for {skill_dir.name}")
            return
        print(json.dumps(rows, indent=2))
        return

    if args.command == "rollback":
        rollback(skill_dir, args.version_id)
        print(f"Rollback complete → {skill_dir} restored from versions/{args.version_id}")
        print("  Current state archived as pre-rollback snapshot")


if __name__ == "__main__":
    main()
