"""Run the local data pipeline."""

from __future__ import annotations

import argparse

from export_frontend_json import export_mock_data
from preprocess_trips import ensure_processed_dir


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mock", action="store_true", help="export lightweight mock JSON for frontend development")
    args = parser.parse_args()

    ensure_processed_dir()
    if args.mock:
        export_mock_data()
        return

    print("pipeline scaffold ready. Use --mock for current frontend placeholder data.")


if __name__ == "__main__":
    main()

