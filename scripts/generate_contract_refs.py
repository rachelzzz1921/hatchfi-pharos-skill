#!/usr/bin/env python3
"""Generate references from CompliantRWAToken.sol contract surface."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from contract_surface import (
    ROOT,
    cheat_sheet_functions,
    drift_report,
    external_function_names,
    parse_contract,
    write_generated,
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Auto-generate contract reference from Solidity source")
    parser.add_argument(
        "--sol",
        type=Path,
        default=ROOT / "src" / "CompliantRWAToken.sol",
        help="Solidity source path",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=ROOT / "references" / "generated",
        help="Output directory for generated refs",
    )
    parser.add_argument(
        "--check-drift",
        action="store_true",
        help="Fail if rwa-issuance cheat sheet drifts from parsed contract",
    )
    args = parser.parse_args()

    surface = parse_contract(args.sol)
    json_path, md_path = write_generated(surface, args.out)

    issuance = ROOT / "references" / "rwa-issuance.md"
    drift = drift_report(surface, issuance)

    print(f"Generated {md_path.relative_to(ROOT)}")
    print(f"Generated {json_path.relative_to(ROOT)}")
    print(
        f"  functions={surface['counts']['functions']} "
        f"events={surface['counts']['events']} "
        f"errors={surface['counts']['errors']}"
    )

    if args.check_drift and drift:
        print("Drift detected vs references/rwa-issuance.md:")
        for item in drift:
            print(f"  - {item}")
        sys.exit(1)

    if drift:
        print("Drift notes (non-blocking):")
        for item in drift:
            print(f"  - {item}")


if __name__ == "__main__":
    main()
