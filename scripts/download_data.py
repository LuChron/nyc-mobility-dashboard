"""Download NYC TLC monthly trip record parquet files.

The downloader only fetches raw source files. It does not inspect parquet
schemas or decide which columns will be used later in preprocessing.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
from dataclasses import asdict, dataclass
from datetime import date, datetime, timezone
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


BASE_URL = "https://d37ci6vzurychx.cloudfront.net/trip-data"
CATALOG_URL = "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page"
USER_AGENT = "Mozilla/5.0 (compatible; nyc-mobility-dashboard/1.0)"
SOURCES = {
    "yellow": "yellow_tripdata",
    "green": "green_tripdata",
    "hvfhv": "fhvhv_tripdata",
}
DEFAULT_START = "2025-01"
DEFAULT_SOURCES = tuple(SOURCES.keys())
HEAD_CACHE: dict[str, "RemoteFile"] = {}
PREFIX_TO_SOURCE = {prefix: source for source, prefix in SOURCES.items()}
CATALOG_PATTERN = re.compile(
    r"https://d37ci6vzurychx\.cloudfront\.net/trip-data/"
    r"(yellow_tripdata|green_tripdata|fhvhv_tripdata)_(\d{4}-\d{2})\.parquet"
)


@dataclass(frozen=True)
class RemoteFile:
    available: bool
    size_bytes: int | None = None
    status: int | None = None
    error: str | None = None


@dataclass(frozen=True)
class DownloadTask:
    source: str
    month: str
    url: str
    target: Path
    size_bytes: int | None = None


@dataclass
class DownloadResult:
    source: str
    month: str
    url: str
    target: str
    status: str
    size_bytes: int | None
    message: str


def parse_month(value: str) -> tuple[int, int]:
    try:
        year_text, month_text = value.split("-", maxsplit=1)
        year, month = int(year_text), int(month_text)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"invalid month {value!r}; expected YYYY-MM") from exc
    if year < 2000 or month < 1 or month > 12:
        raise argparse.ArgumentTypeError(f"invalid month {value!r}; expected YYYY-MM")
    return year, month


def format_month(year: int, month: int) -> str:
    return f"{year:04d}-{month:02d}"


def add_month(year: int, month: int) -> tuple[int, int]:
    month += 1
    if month == 13:
        return year + 1, 1
    return year, month


def month_range(start: str, end: str) -> list[str]:
    start_year, start_month = parse_month(start)
    end_year, end_month = parse_month(end)
    if (start_year, start_month) > (end_year, end_month):
        raise ValueError(f"start month {start} is after end month {end}")

    months: list[str] = []
    year, month = start_year, start_month
    while (year, month) <= (end_year, end_month):
        months.append(format_month(year, month))
        year, month = add_month(year, month)
    return months


def parse_sources(value: str) -> tuple[str, ...]:
    if value.lower() == "all":
        return DEFAULT_SOURCES
    sources = tuple(part.strip().lower() for part in value.split(",") if part.strip())
    unknown = [source for source in sources if source not in SOURCES]
    if unknown:
        expected = ", ".join(SOURCES)
        raise argparse.ArgumentTypeError(f"unknown source(s): {', '.join(unknown)}; expected {expected}")
    if not sources:
        raise argparse.ArgumentTypeError("at least one source is required")
    return sources


def trip_url(source: str, month: str) -> str:
    return f"{BASE_URL}/{SOURCES[source]}_{month}.parquet"


def target_path(raw_dir: Path, source: str, month: str) -> Path:
    return raw_dir / source / f"{SOURCES[source]}_{month}.parquet"


def request_headers(extra: dict[str, str] | None = None) -> dict[str, str]:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "*/*",
        "Referer": CATALOG_URL,
    }
    if extra:
        headers.update(extra)
    return headers


def fetch_tlc_catalog(timeout: int) -> dict[tuple[str, str], str]:
    request = Request(CATALOG_URL, headers=request_headers({"Accept": "text/html"}))
    with urlopen(request, timeout=timeout) as response:
        html = response.read().decode("utf-8", errors="replace")

    catalog: dict[tuple[str, str], str] = {}
    for prefix, month in CATALOG_PATTERN.findall(html):
        source = PREFIX_TO_SOURCE[prefix]
        catalog[(source, month)] = trip_url(source, month)
    return catalog


def head_remote_file(url: str, timeout: int) -> RemoteFile:
    cached = HEAD_CACHE.get(url)
    if cached is not None:
        return cached

    request = Request(url, method="HEAD", headers=request_headers())
    try:
        with urlopen(request, timeout=timeout) as response:
            length = response.headers.get("Content-Length")
            result = RemoteFile(
                available=200 <= response.status < 300,
                size_bytes=int(length) if length and length.isdigit() else None,
                status=response.status,
            )
            HEAD_CACHE[url] = result
            return result
    except HTTPError as exc:
        result = RemoteFile(available=False, status=exc.code, error=str(exc))
    except URLError as exc:
        result = RemoteFile(available=False, error=str(exc.reason))
    except TimeoutError:
        result = RemoteFile(available=False, error="timeout")

    if not result.available:
        range_result = range_probe_remote_file(url, timeout)
        if range_result.available:
            HEAD_CACHE[url] = range_result
            return range_result

    HEAD_CACHE[url] = result
    return result


def range_probe_remote_file(url: str, timeout: int) -> RemoteFile:
    request = Request(
        url,
        headers=request_headers({"Range": "bytes=0-0"}),
    )
    try:
        with urlopen(request, timeout=timeout) as response:
            content_range = response.headers.get("Content-Range", "")
            length = response.headers.get("Content-Length")
            size_bytes: int | None = None
            if "/" in content_range:
                total = content_range.rsplit("/", maxsplit=1)[-1]
                if total.isdigit():
                    size_bytes = int(total)
            elif length and length.isdigit():
                size_bytes = int(length)
            return RemoteFile(
                available=200 <= response.status < 300,
                size_bytes=size_bytes,
                status=response.status,
            )
    except HTTPError as exc:
        return RemoteFile(available=False, status=exc.code, error=str(exc))
    except URLError as exc:
        return RemoteFile(available=False, error=str(exc.reason))
    except TimeoutError:
        return RemoteFile(available=False, error="timeout")


def resolve_latest_common_month(start: str, sources: tuple[str, ...], timeout: int, probe_delay: float) -> str:
    try:
        catalog = fetch_tlc_catalog(timeout)
        candidate_months = sorted({month for (source, month) in catalog if source in sources})
        requested_months = set(month_range(start, candidate_months[-1])) if candidate_months else set()
        complete_months = [
            month
            for month in candidate_months
            if month in requested_months and all((source, month) in catalog for source in sources)
        ]
        if complete_months:
            latest = complete_months[-1]
            print(f"Latest common available month from TLC catalog: {latest}")
            return latest
        print("TLC catalog did not contain a complete month for selected sources; falling back to remote probes.")
    except (HTTPError, URLError, TimeoutError, OSError) as exc:
        print(f"Failed to read TLC catalog ({exc}); falling back to remote probes.")

    today = date.today()
    probe_end = format_month(today.year, today.month)
    latest: str | None = None

    print(f"Probing available months from {start} to {probe_end} for: {', '.join(sources)}")
    for month in month_range(start, probe_end):
        checks = [head_remote_file(trip_url(source, month), timeout) for source in sources]
        if all(check.available for check in checks):
            latest = month
            sizes = ", ".join(
                f"{source}={format_size(check.size_bytes)}" for source, check in zip(sources, checks)
            )
            print(f"  {month}: available ({sizes})")
        else:
            missing = ", ".join(
                f"{source}:{check.status or check.error}" for source, check in zip(sources, checks) if not check.available
            )
            print(f"  {month}: not complete ({missing})")
        if probe_delay > 0:
            time.sleep(probe_delay)

    if latest is None:
        raise RuntimeError(f"no complete month found from {start} for sources: {', '.join(sources)}")

    print(f"Latest common available month: {latest}")
    return latest


def build_tasks(
    start: str,
    end: str,
    raw_dir: Path,
    sources: tuple[str, ...] = DEFAULT_SOURCES,
    timeout: int = 30,
    check_remote: bool = True,
    catalog: dict[tuple[str, str], str] | None = None,
) -> list[DownloadTask]:
    tasks: list[DownloadTask] = []
    for month in month_range(start, end):
        for source in sources:
            url = catalog.get((source, month), trip_url(source, month)) if catalog else trip_url(source, month)
            remote = head_remote_file(url, timeout) if check_remote else RemoteFile(available=True)
            if not remote.available:
                reason = remote.status or remote.error or "unavailable"
                print(f"Remote check warning: {source} {month} returned {reason}; task will still be downloaded.")
                remote = RemoteFile(available=True)
            tasks.append(
                DownloadTask(
                    source=source,
                    month=month,
                    url=url,
                    target=target_path(raw_dir, source, month),
                    size_bytes=remote.size_bytes,
                )
            )
    return tasks


def format_size(size_bytes: int | None) -> str:
    if size_bytes is None:
        return "unknown"
    units = ["B", "KB", "MB", "GB"]
    size = float(size_bytes)
    for unit in units:
        if size < 1024 or unit == units[-1]:
            return f"{size:.1f} {unit}"
        size /= 1024
    return f"{size_bytes} B"


def is_complete_existing_file(task: DownloadTask) -> bool:
    if not task.target.exists():
        return False
    if task.size_bytes is None:
        return task.target.stat().st_size > 0
    return task.target.stat().st_size == task.size_bytes


def download_task(task: DownloadTask, timeout: int, retries: int, force: bool) -> DownloadResult:
    task.target.parent.mkdir(parents=True, exist_ok=True)

    if not force and is_complete_existing_file(task):
        return DownloadResult(
            source=task.source,
            month=task.month,
            url=task.url,
            target=str(task.target),
            status="skipped",
            size_bytes=task.target.stat().st_size,
            message="file already exists",
        )

    part_path = task.target.with_suffix(task.target.suffix + ".part")
    for attempt in range(1, retries + 2):
        try:
            request = Request(task.url, headers=request_headers())
            with urlopen(request, timeout=timeout) as response, part_path.open("wb") as output:
                downloaded = 0
                last_report = 0
                while True:
                    chunk = response.read(1024 * 1024)
                    if not chunk:
                        break
                    output.write(chunk)
                    downloaded += len(chunk)
                    if downloaded - last_report >= 50 * 1024 * 1024:
                        last_report = downloaded
                        print(f"    {task.source} {task.month}: {format_size(downloaded)} downloaded")

            if task.size_bytes is not None and part_path.stat().st_size != task.size_bytes:
                raise RuntimeError(
                    f"size mismatch: expected {task.size_bytes}, got {part_path.stat().st_size}"
                )

            part_path.replace(task.target)
            return DownloadResult(
                source=task.source,
                month=task.month,
                url=task.url,
                target=str(task.target),
                status="downloaded",
                size_bytes=task.target.stat().st_size,
                message="ok",
            )
        except (HTTPError, URLError, TimeoutError, RuntimeError) as exc:
            if attempt > retries:
                if part_path.exists():
                    part_path.unlink()
                return DownloadResult(
                    source=task.source,
                    month=task.month,
                    url=task.url,
                    target=str(task.target),
                    status="failed",
                    size_bytes=None,
                    message=str(exc),
                )
            wait_seconds = min(2 * attempt, 8)
            print(f"    retry {attempt}/{retries} after error: {exc}; waiting {wait_seconds}s")
            time.sleep(wait_seconds)

    return DownloadResult(
        source=task.source,
        month=task.month,
        url=task.url,
        target=str(task.target),
        status="failed",
        size_bytes=None,
        message="unknown error",
    )


def write_manifest(raw_dir: Path, args: argparse.Namespace, tasks: list[DownloadTask], results: list[DownloadResult]) -> None:
    manifest = {
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "start": args.start,
        "end": args.resolved_end,
        "sources": list(args.sources),
        "baseUrl": BASE_URL,
        "taskCount": len(tasks),
        "results": [asdict(result) for result in results],
    }
    path = raw_dir / "download_manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Manifest written to {path}")


def print_plan(tasks: list[DownloadTask]) -> None:
    total_bytes = sum(task.size_bytes or 0 for task in tasks)
    print(f"Planned files: {len(tasks)}; known total size: {format_size(total_bytes)}")
    for task in tasks:
        print(f"{task.source:6s} {task.month} {format_size(task.size_bytes):>10s} {task.url} -> {task.target}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Download NYC TLC monthly parquet trip data.")
    parser.add_argument("--start", default=DEFAULT_START, type=lambda value: value if parse_month(value) else value)
    parser.add_argument(
        "--end",
        default="latest",
        help="YYYY-MM or 'latest'. 'latest' means latest month available for all selected sources.",
    )
    parser.add_argument("--sources", default="all", type=parse_sources, help="all, or comma list: yellow,green,hvfhv")
    parser.add_argument("--raw-dir", type=Path, default=Path("data/raw"))
    parser.add_argument("--dry-run", action="store_true", help="print tasks without downloading files")
    parser.add_argument("--force", action="store_true", help="redownload files even when a complete file exists")
    parser.add_argument("--check-remote", action="store_true", help="try HEAD/Range probes before planning")
    parser.add_argument("--no-remote-check", action="store_true", help="deprecated; remote checks are off by default")
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--retries", type=int, default=2)
    parser.add_argument("--probe-delay", type=float, default=0.25, help="seconds to wait between latest-month probes")
    args = parser.parse_args()

    catalog: dict[tuple[str, str], str] | None = None
    if args.end == "latest":
        args.resolved_end = resolve_latest_common_month(args.start, args.sources, args.timeout, args.probe_delay)
        try:
            catalog = fetch_tlc_catalog(args.timeout)
        except (HTTPError, URLError, TimeoutError, OSError):
            catalog = None
    else:
        parse_month(args.end)
        args.resolved_end = args.end
        try:
            catalog = fetch_tlc_catalog(args.timeout)
        except (HTTPError, URLError, TimeoutError, OSError):
            catalog = None

    tasks = build_tasks(
        start=args.start,
        end=args.resolved_end,
        raw_dir=args.raw_dir,
        sources=args.sources,
        timeout=args.timeout,
        check_remote=args.check_remote and not args.no_remote_check,
        catalog=catalog,
    )
    print_plan(tasks)

    if args.dry_run:
        return

    results: list[DownloadResult] = []
    for index, task in enumerate(tasks, start=1):
        print(f"[{index}/{len(tasks)}] {task.source} {task.month} -> {task.target}")
        result = download_task(task, timeout=args.timeout, retries=args.retries, force=args.force)
        results.append(result)
        print(f"    {result.status}: {result.message} ({format_size(result.size_bytes)})")

    write_manifest(args.raw_dir, args, tasks, results)
    failed = [result for result in results if result.status == "failed"]
    if failed:
        print(f"Failed downloads: {len(failed)}", file=sys.stderr)
        raise SystemExit(1)


if __name__ == "__main__":
    main()
