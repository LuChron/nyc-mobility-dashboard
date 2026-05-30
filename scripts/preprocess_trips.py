"""Preprocess NYC TLC trip data.

The real implementation should process parquet files month by month and write
aggregated intermediate files under data/processed. Keeping this file now gives
the team a stable command surface before the heavy data dependencies are added.
"""

from __future__ import annotations

from pathlib import Path


def ensure_processed_dir(processed_dir: Path = Path("data/processed")) -> Path:
    processed_dir.mkdir(parents=True, exist_ok=True)
    return processed_dir


def main() -> None:
    processed_dir = ensure_processed_dir()
    print(f"processed data directory ready: {processed_dir}")


if __name__ == "__main__":
    main()

