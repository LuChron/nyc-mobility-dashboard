"""Build NYC TLC trip data download tasks.

This module intentionally defaults to dry-run behavior because monthly parquet
files are large. Real downloads can be enabled later after the team confirms
the covered month range and local storage path.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path


BASE_URL = "https://d37ci6vzurychx.cloudfront.net/trip-data"
SOURCES = {
    "yellow": "yellow_tripdata",
    "green": "green_tripdata",
    "hvfhv": "fhvhv_tripdata",
}


@dataclass(frozen=True)
class DownloadTask:
    source: str
    month: str
    url: str
    target: Path


def month_range(start: str, end: str) -> list[str]:
    start_year, start_month = [int(part) for part in start.split("-")]
    end_year, end_month = [int(part) for part in end.split("-")]
    months: list[str] = []
    year, month = start_year, start_month
    while (year, month) <= (end_year, end_month):
        months.append(f"{year:04d}-{month:02d}")
        month += 1
        if month == 13:
            year += 1
            month = 1
    return months


def build_tasks(start: str, end: str, raw_dir: Path) -> list[DownloadTask]:
    tasks: list[DownloadTask] = []
    for month in month_range(start, end):
        for source, prefix in SOURCES.items():
            filename = f"{prefix}_{month}.parquet"
            tasks.append(
                DownloadTask(
                    source=source,
                    month=month,
                    url=f"{BASE_URL}/{filename}",
                    target=raw_dir / source / filename,
                )
            )
    return tasks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", default="2025-01")
    parser.add_argument("--end", default="2026-04")
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    args = parser.parse_args()

    for task in build_tasks(args.start, args.end, args.raw_dir):
        print(f"{task.source:6s} {task.month} {task.url} -> {task.target}")


if __name__ == "__main__":
    main()

