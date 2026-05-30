"""Export lightweight frontend JSON files."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def export_mock_data(output_dir: Path = Path("frontend/public/data")) -> None:
    metadata = {
        "dataUpdated": datetime.now(timezone.utc).isoformat(),
        "coveredMonths": ["2025-01", "2026-04"],
        "sources": ["yellow", "green", "hvfhv"],
        "mode": "mock",
    }
    monthly_trend = [
        {"month": "2025-01", "all": 28, "yellow": 11, "green": 2.4, "hvfhv": 19},
        {"month": "2025-02", "all": 29, "yellow": 12, "green": 2.7, "hvfhv": 21},
        {"month": "2025-03", "all": 31, "yellow": 13, "green": 3.1, "hvfhv": 22},
    ]
    summary = {
        "totalTrips": 318742891,
        "avgFare": 17.62,
        "avgDistance": 3.72,
        "peakHour": "17:00-18:00",
    }

    write_json(output_dir / "metadata.json", metadata)
    write_json(output_dir / "summary_overview.json", summary)
    write_json(output_dir / "monthly_trend.json", monthly_trend)


def main() -> None:
    export_mock_data()
    print("mock frontend JSON exported to frontend/public/data")


if __name__ == "__main__":
    main()

