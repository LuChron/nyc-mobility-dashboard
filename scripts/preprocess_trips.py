"""Preprocess NYC TLC parquet files into frontend-ready JSON.

The pipeline processes one parquet file at a time with DuckDB, appends compact
aggregate tables to data/processed, then exports lightweight JSON files under
frontend/public/data. It avoids loading raw trip rows into Python memory.
"""

from __future__ import annotations

import argparse
import json
import math
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_RAW_DIR = ROOT / "data" / "raw"
DEFAULT_PROCESSED_DIR = ROOT / "data" / "processed"
DEFAULT_OUTPUT_DIR = ROOT / "frontend" / "public" / "data"
DEFAULT_GEOJSON_PATH = DEFAULT_OUTPUT_DIR / "taxi_zones.geojson"
SOURCES = ("yellow", "green", "hvfhv")
SOURCE_LABELS = {"all": "All Services", "yellow": "Yellow Taxi", "green": "Green Taxi", "hvfhv": "HVFHV"}


def import_duckdb():
    try:
        import duckdb  # type: ignore
    except ModuleNotFoundError as exc:
        raise SystemExit("DuckDB is required. Install with: python -m pip install duckdb") from exc
    return duckdb


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2, allow_nan=False), encoding="utf-8")


def clean_value(value: Any) -> Any:
    if isinstance(value, float) and (math.isnan(value) or math.isinf(value)):
        return None
    if isinstance(value, datetime):
        return value.isoformat()
    return value


def fetch_rows(con, sql: str) -> list[dict[str, Any]]:
    rows = con.execute(sql).fetchall()
    names = [item[0] for item in con.description]
    return [{name: clean_value(value) for name, value in zip(names, row)} for row in rows]


def quote_path(path: Path) -> str:
    return path.as_posix().replace("'", "''")


def iter_coords(geometry: dict[str, Any]):
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates", [])
    polygons = [coordinates] if kind == "Polygon" else coordinates if kind == "MultiPolygon" else []
    for polygon in polygons:
        for ring in polygon:
            for coord in ring:
                if isinstance(coord, list) and len(coord) >= 2:
                    yield float(coord[0]), float(coord[1])


def load_zone_lookup(geojson_path: Path) -> list[dict[str, Any]]:
    geojson = json.loads(geojson_path.read_text(encoding="utf-8"))
    zones: list[dict[str, Any]] = []
    for feature in geojson.get("features", []):
        props = feature.get("properties", {})
        coords = list(iter_coords(feature.get("geometry", {})))
        lon = sum(coord[0] for coord in coords) / len(coords) if coords else None
        lat = sum(coord[1] for coord in coords) / len(coords) if coords else None
        zones.append(
            {
                "location_id": int(props["locationid"]),
                "zone": props.get("zone", props["locationid"]),
                "borough": props.get("borough", "Unknown"),
                "centroid": [lon, lat] if lon is not None and lat is not None else None,
            }
        )
    return sorted(zones, key=lambda item: item["location_id"])


def create_zone_table(con, zones: list[dict[str, Any]]) -> None:
    con.execute("CREATE OR REPLACE TEMP TABLE valid_zones(location_id INTEGER, zone VARCHAR, borough VARCHAR, lon DOUBLE, lat DOUBLE)")
    con.executemany(
        "INSERT INTO valid_zones VALUES (?, ?, ?, ?, ?)",
        [
            (
                item["location_id"],
                item["zone"],
                item["borough"],
                item["centroid"][0] if item["centroid"] else None,
                item["centroid"][1] if item["centroid"] else None,
            )
            for item in zones
        ],
    )


def reset_tables(con) -> None:
    for name in [
        "raw_stats",
        "summary_source",
        "zone_metric_source",
        "od_group_source",
        "hourly_source",
        "heatmap_source",
        "distribution_source",
    ]:
        con.execute(f"DROP TABLE IF EXISTS {name}")

    con.execute(
        """
        CREATE TABLE raw_stats(
          source VARCHAR, month VARCHAR, raw_record_count BIGINT,
          outside_month_rows BIGINT, nonpositive_duration_rows BIGINT, duration_over_24h_rows BIGINT,
          invalid_pickup_zone_rows BIGINT, invalid_dropoff_zone_rows BIGINT,
          nonpositive_distance_rows BIGINT, distance_over_100_rows BIGINT,
          negative_fare_rows BIGINT, fare_over_500_rows BIGINT
        )
        """
    )
    metric_cols = """
      trip_count BIGINT, fare_sum DOUBLE, fare_valid_count BIGINT,
      distance_sum DOUBLE, distance_valid_count BIGINT,
      duration_sum DOUBLE, duration_valid_count BIGINT
    """
    con.execute(f"CREATE TABLE summary_source(source VARCHAR, month VARCHAR, day_type VARCHAR, borough VARCHAR, zone_id VARCHAR, {metric_cols})")
    con.execute(f"CREATE TABLE zone_metric_source(source VARCHAR, month VARCHAR, day_type VARCHAR, location_id INTEGER, borough VARCHAR, pickup_count BIGINT, dropoff_count BIGINT, {metric_cols})")
    con.execute(
        f"""
        CREATE TABLE od_group_source(
          source VARCHAR, month VARCHAR, day_type VARCHAR,
          from_location_id INTEGER, to_location_id INTEGER,
          from_zone VARCHAR, to_zone VARCHAR, from_borough VARCHAR, to_borough VARCHAR,
          from_lon DOUBLE, from_lat DOUBLE, to_lon DOUBLE, to_lat DOUBLE,
          {metric_cols}
        )
        """
    )
    con.execute("CREATE TABLE hourly_source(source VARCHAR, month VARCHAR, day_type VARCHAR, borough VARCHAR, zone_id VARCHAR, hour INTEGER, trip_count BIGINT)")
    con.execute("CREATE TABLE heatmap_source(source VARCHAR, month VARCHAR, borough VARCHAR, zone_id VARCHAR, weekday INTEGER, hour INTEGER, trip_count BIGINT)")
    con.execute("CREATE TABLE distribution_source(mode VARCHAR, source VARCHAR, month VARCHAR, day_type VARCHAR, borough VARCHAR, zone_id VARCHAR, bucket_start DOUBLE, bucket_end DOUBLE, trip_count BIGINT)")


def discover_files(raw_dir: Path, max_files: int | None = None) -> list[tuple[str, str, Path]]:
    tasks: list[tuple[str, str, Path]] = []
    for source in SOURCES:
        for path in sorted((raw_dir / source).glob("*.parquet")):
            match = re.search(r"(\d{4}-\d{2})", path.name)
            if match:
                tasks.append((source, match.group(1), path))
    return tasks[:max_files] if max_files else tasks


def create_current_tables(con, source: str, month: str, path: Path) -> None:
    parquet = quote_path(path)
    if source == "yellow":
        field_sql = """
          tpep_pickup_datetime AS pickup_time,
          tpep_dropoff_datetime AS dropoff_time,
          PULocationID::INTEGER AS pickup_zone,
          DOLocationID::INTEGER AS dropoff_zone,
          trip_distance::DOUBLE AS distance,
          date_diff('second', tpep_pickup_datetime, tpep_dropoff_datetime)::BIGINT AS duration_seconds,
          fare_amount::DOUBLE AS fare,
          tip_amount::DOUBLE AS tips,
          tolls_amount::DOUBLE AS tolls
        """
    elif source == "green":
        field_sql = """
          lpep_pickup_datetime AS pickup_time,
          lpep_dropoff_datetime AS dropoff_time,
          PULocationID::INTEGER AS pickup_zone,
          DOLocationID::INTEGER AS dropoff_zone,
          trip_distance::DOUBLE AS distance,
          date_diff('second', lpep_pickup_datetime, lpep_dropoff_datetime)::BIGINT AS duration_seconds,
          fare_amount::DOUBLE AS fare,
          tip_amount::DOUBLE AS tips,
          tolls_amount::DOUBLE AS tolls
        """
    else:
        field_sql = """
          pickup_datetime AS pickup_time,
          dropoff_datetime AS dropoff_time,
          PULocationID::INTEGER AS pickup_zone,
          DOLocationID::INTEGER AS dropoff_zone,
          trip_miles::DOUBLE AS distance,
          trip_time::BIGINT AS duration_seconds,
          base_passenger_fare::DOUBLE AS fare,
          tips::DOUBLE AS tips,
          tolls::DOUBLE AS tolls
        """

    con.execute("DROP TABLE IF EXISTS current_raw")
    con.execute("DROP TABLE IF EXISTS current_clean")
    con.execute(
        f"""
        CREATE TEMP TABLE current_raw AS
        SELECT '{source}' AS source, '{month}' AS month, {field_sql}
        FROM read_parquet('{parquet}')
        """
    )
    con.execute(
        f"""
        CREATE TEMP TABLE current_clean AS
        SELECT
          *,
          CASE WHEN CAST(strftime(pickup_time, '%w') AS INTEGER) BETWEEN 1 AND 5 THEN 'weekday' ELSE 'weekend' END AS actual_day_type,
          ((CAST(strftime(pickup_time, '%w') AS INTEGER) + 6) % 7)::INTEGER AS weekday,
          extract('hour' FROM pickup_time)::INTEGER AS hour
        FROM current_raw
        WHERE strftime(pickup_time, '%Y-%m') = '{month}'
          AND dropoff_time > pickup_time
          AND duration_seconds > 0
          AND duration_seconds <= 86400
        """
    )


METRICS_SQL = """
  count(*)::BIGINT AS trip_count,
  sum(CASE WHEN fare >= 0 THEN fare ELSE 0 END)::DOUBLE AS fare_sum,
  sum(CASE WHEN fare >= 0 THEN 1 ELSE 0 END)::BIGINT AS fare_valid_count,
  sum(CASE WHEN distance > 0 THEN distance ELSE 0 END)::DOUBLE AS distance_sum,
  sum(CASE WHEN distance > 0 THEN 1 ELSE 0 END)::BIGINT AS distance_valid_count,
  sum(CASE WHEN duration_seconds > 0 AND duration_seconds <= 86400 THEN duration_seconds ELSE 0 END)::DOUBLE AS duration_sum,
  sum(CASE WHEN duration_seconds > 0 AND duration_seconds <= 86400 THEN 1 ELSE 0 END)::BIGINT AS duration_valid_count
"""


def process_current_file(con) -> None:
    con.execute(
        """
        INSERT INTO raw_stats
        SELECT
          source, month,
          count(*)::BIGINT AS raw_record_count,
          sum(CASE WHEN strftime(pickup_time, '%Y-%m') != month THEN 1 ELSE 0 END)::BIGINT AS outside_month_rows,
          sum(CASE WHEN dropoff_time <= pickup_time OR duration_seconds <= 0 THEN 1 ELSE 0 END)::BIGINT AS nonpositive_duration_rows,
          sum(CASE WHEN duration_seconds > 86400 THEN 1 ELSE 0 END)::BIGINT AS duration_over_24h_rows,
          sum(CASE WHEN pickup_zone NOT IN (SELECT location_id FROM valid_zones) THEN 1 ELSE 0 END)::BIGINT AS invalid_pickup_zone_rows,
          sum(CASE WHEN dropoff_zone NOT IN (SELECT location_id FROM valid_zones) THEN 1 ELSE 0 END)::BIGINT AS invalid_dropoff_zone_rows,
          sum(CASE WHEN distance IS NULL OR distance <= 0 THEN 1 ELSE 0 END)::BIGINT AS nonpositive_distance_rows,
          sum(CASE WHEN distance > 100 THEN 1 ELSE 0 END)::BIGINT AS distance_over_100_rows,
          sum(CASE WHEN fare IS NULL OR fare < 0 THEN 1 ELSE 0 END)::BIGINT AS negative_fare_rows,
          sum(CASE WHEN fare > 500 THEN 1 ELSE 0 END)::BIGINT AS fare_over_500_rows
        FROM current_raw
        GROUP BY source, month
        """
    )
    con.execute(
        f"""
        INSERT INTO summary_source
        SELECT source, month, day_type, 'all' AS borough, 'all' AS zone_id, {METRICS_SQL}
        FROM (
          SELECT *, actual_day_type AS day_type FROM current_clean
          UNION ALL
          SELECT *, 'all' AS day_type FROM current_clean
        )
        GROUP BY source, month, day_type
        """
    )
    con.execute(
        f"""
        INSERT INTO zone_metric_source
        WITH expanded AS (
          SELECT *, actual_day_type AS day_type FROM current_clean
          UNION ALL
          SELECT *, 'all' AS day_type FROM current_clean
        ),
        pickup AS (
          SELECT
            source, month, day_type, pickup_zone AS location_id, vz.borough,
            count(*)::BIGINT AS pickup_count,
            sum(CASE WHEN fare >= 0 THEN fare ELSE 0 END)::DOUBLE AS fare_sum,
            sum(CASE WHEN fare >= 0 THEN 1 ELSE 0 END)::BIGINT AS fare_valid_count,
            sum(CASE WHEN distance > 0 THEN distance ELSE 0 END)::DOUBLE AS distance_sum,
            sum(CASE WHEN distance > 0 THEN 1 ELSE 0 END)::BIGINT AS distance_valid_count,
            sum(duration_seconds)::DOUBLE AS duration_sum,
            count(*)::BIGINT AS duration_valid_count
          FROM expanded e
          JOIN valid_zones vz ON e.pickup_zone = vz.location_id
          GROUP BY source, month, day_type, pickup_zone, vz.borough
        ),
        dropoff AS (
          SELECT source, month, day_type, dropoff_zone AS location_id, vz.borough, count(*)::BIGINT AS dropoff_count
          FROM expanded e
          JOIN valid_zones vz ON e.dropoff_zone = vz.location_id
          GROUP BY source, month, day_type, dropoff_zone, vz.borough
        )
        SELECT
          coalesce(p.source, d.source) AS source,
          coalesce(p.month, d.month) AS month,
          coalesce(p.day_type, d.day_type) AS day_type,
          coalesce(p.location_id, d.location_id)::INTEGER AS location_id,
          coalesce(p.borough, d.borough) AS borough,
          coalesce(p.pickup_count, 0)::BIGINT AS pickup_count,
          coalesce(d.dropoff_count, 0)::BIGINT AS dropoff_count,
          coalesce(p.pickup_count, 0)::BIGINT AS trip_count,
          coalesce(p.fare_sum, 0)::DOUBLE AS fare_sum,
          coalesce(p.fare_valid_count, 0)::BIGINT AS fare_valid_count,
          coalesce(p.distance_sum, 0)::DOUBLE AS distance_sum,
          coalesce(p.distance_valid_count, 0)::BIGINT AS distance_valid_count,
          coalesce(p.duration_sum, 0)::DOUBLE AS duration_sum,
          coalesce(p.duration_valid_count, 0)::BIGINT AS duration_valid_count
        FROM pickup p
        FULL OUTER JOIN dropoff d USING (source, month, day_type, location_id, borough)
        """
    )
    con.execute(
        f"""
        INSERT INTO od_group_source
        WITH expanded AS (
          SELECT *, actual_day_type AS day_type FROM current_clean
          UNION ALL
          SELECT *, 'all' AS day_type FROM current_clean
        )
        SELECT
          e.source, e.month, e.day_type,
          e.pickup_zone AS from_location_id,
          e.dropoff_zone AS to_location_id,
          pu.zone AS from_zone,
          dz.zone AS to_zone,
          pu.borough AS from_borough,
          dz.borough AS to_borough,
          pu.lon AS from_lon,
          pu.lat AS from_lat,
          dz.lon AS to_lon,
          dz.lat AS to_lat,
          {METRICS_SQL}
        FROM expanded e
        JOIN valid_zones pu ON e.pickup_zone = pu.location_id
        JOIN valid_zones dz ON e.dropoff_zone = dz.location_id
        WHERE e.pickup_zone != e.dropoff_zone
        GROUP BY e.source, e.month, e.day_type, e.pickup_zone, e.dropoff_zone,
                 pu.zone, dz.zone, pu.borough, dz.borough, pu.lon, pu.lat, dz.lon, dz.lat
        """
    )
    con.execute(
        """
        INSERT INTO hourly_source
        SELECT source, month, day_type, 'all' AS borough, 'all' AS zone_id, hour, count(*)::BIGINT AS trip_count
        FROM (
          SELECT *, actual_day_type AS day_type FROM current_clean
          UNION ALL
          SELECT *, 'all' AS day_type FROM current_clean
        )
        GROUP BY source, month, day_type, hour
        """
    )
    con.execute(
        """
        INSERT INTO heatmap_source
        SELECT source, month, 'all' AS borough, 'all' AS zone_id, weekday, hour, count(*)::BIGINT AS trip_count
        FROM current_clean
        GROUP BY source, month, weekday, hour
        """
    )
    con.execute(
        """
        INSERT INTO distribution_source
        WITH expanded AS (
          SELECT *, actual_day_type AS day_type FROM current_clean
          UNION ALL
          SELECT *, 'all' AS day_type FROM current_clean
        ),
        bucketed AS (
          SELECT
            'fare' AS mode, source, month, day_type, 'all' AS borough, 'all' AS zone_id,
            CASE WHEN fare < 10 THEN 0 WHEN fare < 20 THEN 10 WHEN fare < 30 THEN 20 WHEN fare < 40 THEN 30
                 WHEN fare < 50 THEN 40 WHEN fare < 70 THEN 50 WHEN fare < 100 THEN 70 ELSE 100 END::DOUBLE AS bucket_start,
            CASE WHEN fare < 10 THEN 10 WHEN fare < 20 THEN 20 WHEN fare < 30 THEN 30 WHEN fare < 40 THEN 40
                 WHEN fare < 50 THEN 50 WHEN fare < 70 THEN 70 WHEN fare < 100 THEN 100 ELSE NULL END::DOUBLE AS bucket_end
          FROM expanded WHERE fare >= 0
          UNION ALL
          SELECT
            'distance' AS mode, source, month, day_type, 'all' AS borough, 'all' AS zone_id,
            CASE WHEN distance < 1 THEN 0 WHEN distance < 2 THEN 1 WHEN distance < 3 THEN 2 WHEN distance < 5 THEN 3
                 WHEN distance < 8 THEN 5 WHEN distance < 12 THEN 8 WHEN distance < 20 THEN 12 ELSE 20 END::DOUBLE AS bucket_start,
            CASE WHEN distance < 1 THEN 1 WHEN distance < 2 THEN 2 WHEN distance < 3 THEN 3 WHEN distance < 5 THEN 5
                 WHEN distance < 8 THEN 8 WHEN distance < 12 THEN 12 WHEN distance < 20 THEN 20 ELSE NULL END::DOUBLE AS bucket_end
          FROM expanded WHERE distance > 0
        )
        SELECT mode, source, month, day_type, borough, zone_id, bucket_start, bucket_end, count(*)::BIGINT AS trip_count
        FROM bucketed
        GROUP BY mode, source, month, day_type, borough, zone_id, bucket_start, bucket_end
        """
    )


def metric_select(prefix: str = "") -> str:
    return f"""
      sum({prefix}trip_count)::BIGINT AS trip_count,
      sum({prefix}fare_sum)::DOUBLE AS fare_sum,
      sum({prefix}fare_valid_count)::BIGINT AS fare_valid_count,
      sum({prefix}distance_sum)::DOUBLE AS distance_sum,
      sum({prefix}distance_valid_count)::BIGINT AS distance_valid_count,
      sum({prefix}duration_sum)::DOUBLE AS duration_sum,
      sum({prefix}duration_valid_count)::BIGINT AS duration_valid_count
    """


def add_averages_sql(table_sql: str) -> str:
    return f"""
    SELECT
      *,
      CASE WHEN fare_valid_count > 0 THEN fare_sum / fare_valid_count ELSE NULL END AS avg_fare,
      CASE WHEN distance_valid_count > 0 THEN distance_sum / distance_valid_count ELSE NULL END AS avg_distance,
      CASE WHEN duration_valid_count > 0 THEN duration_sum / duration_valid_count / 60 ELSE NULL END AS avg_duration_minutes
    FROM ({table_sql})
    """


def export_tables(con, output_dir: Path, processed_dir: Path, raw_dir: Path, zones: list[dict[str, Any]], od_top_n: int) -> dict[str, int]:
    counts: dict[str, int] = {}

    source_stats = fetch_rows(con, "SELECT source, sum(raw_record_count)::BIGINT AS raw_record_count FROM raw_stats GROUP BY source ORDER BY source")
    source_clean = fetch_rows(
        con,
        """
        SELECT source, sum(trip_count)::BIGINT AS time_clean_record_count
        FROM summary_source
        WHERE day_type = 'all'
        GROUP BY source
        ORDER BY source
        """,
    )
    source_od = fetch_rows(
        con,
        """
        SELECT source, sum(trip_count)::BIGINT AS od_clean_record_count
        FROM od_group_source
        WHERE day_type = 'all'
        GROUP BY source
        ORDER BY source
        """,
    )
    by_source = []
    for row in source_stats:
        source = row["source"]
        clean = next((item for item in source_clean if item["source"] == source), {})
        od = next((item for item in source_od if item["source"] == source), {})
        by_source.append({**row, **clean, **od})

    months = [row["month"] for row in fetch_rows(con, "SELECT DISTINCT month FROM raw_stats ORDER BY month")]
    raw_stats = fetch_rows(con, "SELECT * FROM raw_stats ORDER BY source, month")
    totals = {
        "raw_record_count": sum(row["raw_record_count"] for row in raw_stats),
        "time_clean_record_count": sum(row.get("time_clean_record_count", 0) for row in by_source),
        "od_clean_record_count": sum(row.get("od_clean_record_count", 0) for row in by_source),
        "outside_month_rows": sum(row["outside_month_rows"] for row in raw_stats),
        "nonpositive_duration_rows": sum(row["nonpositive_duration_rows"] for row in raw_stats),
        "duration_over_24h_rows": sum(row["duration_over_24h_rows"] for row in raw_stats),
        "invalid_pickup_zone_rows": sum(row["invalid_pickup_zone_rows"] for row in raw_stats),
        "invalid_dropoff_zone_rows": sum(row["invalid_dropoff_zone_rows"] for row in raw_stats),
        "nonpositive_distance_rows": sum(row["nonpositive_distance_rows"] for row in raw_stats),
        "distance_over_100_rows": sum(row["distance_over_100_rows"] for row in raw_stats),
        "negative_fare_rows": sum(row["negative_fare_rows"] for row in raw_stats),
        "fare_over_500_rows": sum(row["fare_over_500_rows"] for row in raw_stats),
    }
    metadata = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": "real",
        "covered_months": [months[0], months[-1]] if months else [],
        "month_count": len(months),
        "months": months,
        "sources": list(SOURCES),
        "source_labels": SOURCE_LABELS,
        "raw_file_count": len(list(raw_dir.glob("*/*.parquet"))),
        "raw_size_bytes": sum(path.stat().st_size for path in raw_dir.glob("*/*.parquet")),
        "taxi_zone_count": len(zones),
        "totals": totals,
        "by_source": by_source,
        "by_source_month": raw_stats,
        "cleaning_rules": {
            "time_clean": "pickup month equals file month; dropoff is after pickup; duration is between 0 and 24 hours",
            "zone_metrics": "pickup/dropoff metrics require the corresponding LocationID to exist in taxi_zones.geojson",
            "od_routes": "both pickup and dropoff LocationID must exist in taxi_zones.geojson and pickup != dropoff",
            "fare_metrics": "fare values below 0 are excluded from fare_sum and avg_fare denominators",
            "distance_metrics": "distance values less than or equal to 0 are excluded from distance_sum and avg_distance denominators",
        },
    }
    write_json(output_dir / "metadata.json", metadata)
    counts["metadata.json"] = 1
    write_json(output_dir / "zone_lookup.json", zones)
    counts["zone_lookup.json"] = len(zones)

    summary_sql = add_averages_sql(
        f"""
        SELECT source, month, day_type, borough, zone_id, {metric_select()}
        FROM summary_source
        GROUP BY source, month, day_type, borough, zone_id
        UNION ALL
        SELECT 'all' AS source, month, day_type, borough, zone_id, {metric_select()}
        FROM summary_source
        GROUP BY month, day_type, borough, zone_id
        """
    )
    peak_sql = """
      SELECT source, month, day_type, borough, zone_id, hour AS peak_hour, trip_count AS peak_hour_trip_count
      FROM (
        SELECT *, row_number() OVER (PARTITION BY source, month, day_type, borough, zone_id ORDER BY trip_count DESC, hour) AS rn
        FROM (
          SELECT source, month, day_type, borough, zone_id, hour, sum(trip_count)::BIGINT AS trip_count
          FROM hourly_source GROUP BY source, month, day_type, borough, zone_id, hour
          UNION ALL
          SELECT 'all' AS source, month, day_type, borough, zone_id, hour, sum(trip_count)::BIGINT AS trip_count
          FROM hourly_source GROUP BY month, day_type, borough, zone_id, hour
        )
      ) WHERE rn = 1
    """
    rows = fetch_rows(con, f"SELECT s.*, p.peak_hour, p.peak_hour_trip_count FROM ({summary_sql}) s LEFT JOIN ({peak_sql}) p USING (source, month, day_type, borough, zone_id) ORDER BY source, month, day_type")
    write_json(output_dir / "summary_overview.json", rows)
    counts["summary_overview.json"] = len(rows)

    zone_sql = add_averages_sql(
        f"""
        SELECT source, month, day_type, location_id, borough,
               sum(pickup_count)::BIGINT AS pickup_count,
               sum(dropoff_count)::BIGINT AS dropoff_count,
               {metric_select()}
        FROM zone_metric_source
        GROUP BY source, month, day_type, location_id, borough
        UNION ALL
        SELECT 'all' AS source, month, day_type, location_id, borough,
               sum(pickup_count)::BIGINT AS pickup_count,
               sum(dropoff_count)::BIGINT AS dropoff_count,
               {metric_select()}
        FROM zone_metric_source
        GROUP BY month, day_type, location_id, borough
        """
    )
    rows = fetch_rows(con, f"SELECT * FROM ({zone_sql}) ORDER BY source, month, day_type, location_id")
    write_json(output_dir / "zone_metrics.json", rows)
    write_json(output_dir / "pickup_by_zone.json", rows)
    write_json(output_dir / "dropoff_by_zone.json", rows)
    counts["zone_metrics.json"] = counts["pickup_by_zone.json"] = counts["dropoff_by_zone.json"] = len(rows)

    od_sql = add_averages_sql(
        f"""
        SELECT source, month, day_type, from_location_id, to_location_id,
               any_value(from_zone) AS from_zone, any_value(to_zone) AS to_zone,
               any_value(from_borough) AS from_borough, any_value(to_borough) AS to_borough,
               any_value(from_lon) AS from_lon, any_value(from_lat) AS from_lat,
               any_value(to_lon) AS to_lon, any_value(to_lat) AS to_lat,
               {metric_select()}
        FROM od_group_source
        GROUP BY source, month, day_type, from_location_id, to_location_id
        UNION ALL
        SELECT 'all' AS source, month, day_type, from_location_id, to_location_id,
               any_value(from_zone) AS from_zone, any_value(to_zone) AS to_zone,
               any_value(from_borough) AS from_borough, any_value(to_borough) AS to_borough,
               any_value(from_lon) AS from_lon, any_value(from_lat) AS from_lat,
               any_value(to_lon) AS to_lon, any_value(to_lat) AS to_lat,
               {metric_select()}
        FROM od_group_source
        GROUP BY month, day_type, from_location_id, to_location_id
        """
    )
    rows = fetch_rows(
        con,
        f"""
        SELECT
          source, month, day_type, from_location_id, to_location_id,
          from_zone, to_zone, from_borough, to_borough,
          [from_lon, from_lat] AS from_centroid,
          [to_lon, to_lat] AS to_centroid,
          trip_count, fare_sum, fare_valid_count, distance_sum, distance_valid_count,
          duration_sum, duration_valid_count, avg_fare, avg_distance, avg_duration_minutes
        FROM (
          SELECT *, row_number() OVER (PARTITION BY source, month, day_type ORDER BY trip_count DESC) AS rn
          FROM ({od_sql})
        )
        WHERE rn <= {od_top_n}
        ORDER BY source, month, day_type, trip_count DESC
        """,
    )
    write_json(output_dir / "od_top_routes.json", rows)
    counts["od_top_routes.json"] = len(rows)

    monthly_sql = add_averages_sql(
        f"""
        SELECT source, month, borough, zone_id, {metric_select()}
        FROM summary_source
        WHERE day_type = 'all'
        GROUP BY source, month, borough, zone_id
        UNION ALL
        SELECT 'all' AS source, month, borough, zone_id, {metric_select()}
        FROM summary_source
        WHERE day_type = 'all'
        GROUP BY month, borough, zone_id
        """
    )
    rows = fetch_rows(con, f"SELECT * FROM ({monthly_sql}) ORDER BY source, month")
    write_json(output_dir / "monthly_trend.json", rows)
    counts["monthly_trend.json"] = len(rows)

    hourly_rows = fetch_rows(
        con,
        """
        SELECT source, month, day_type, borough, zone_id, hour, sum(trip_count)::BIGINT AS trip_count
        FROM hourly_source GROUP BY source, month, day_type, borough, zone_id, hour
        UNION ALL
        SELECT 'all' AS source, month, day_type, borough, zone_id, hour, sum(trip_count)::BIGINT AS trip_count
        FROM hourly_source GROUP BY month, day_type, borough, zone_id, hour
        ORDER BY source, month, day_type, hour
        """,
    )
    write_json(output_dir / "hourly_demand.json", hourly_rows)
    counts["hourly_demand.json"] = len(hourly_rows)

    heatmap_rows = fetch_rows(
        con,
        """
        SELECT *,
          CASE weekday WHEN 0 THEN 'Mon' WHEN 1 THEN 'Tue' WHEN 2 THEN 'Wed' WHEN 3 THEN 'Thu'
                       WHEN 4 THEN 'Fri' WHEN 5 THEN 'Sat' ELSE 'Sun' END AS weekday_label
        FROM (
          SELECT source, month, borough, zone_id, weekday, hour, sum(trip_count)::BIGINT AS trip_count
          FROM heatmap_source GROUP BY source, month, borough, zone_id, weekday, hour
          UNION ALL
          SELECT 'all' AS source, month, borough, zone_id, weekday, hour, sum(trip_count)::BIGINT AS trip_count
          FROM heatmap_source GROUP BY month, borough, zone_id, weekday, hour
        )
        ORDER BY source, month, weekday, hour
        """,
    )
    write_json(output_dir / "weekday_hour_heatmap.json", heatmap_rows)
    counts["weekday_hour_heatmap.json"] = len(heatmap_rows)

    comparison_rows = fetch_rows(
        con,
        f"""
        WITH grouped AS (
          {summary_sql}
        ),
        totals AS (
          SELECT month, day_type, borough, zone_id, sum(trip_count)::BIGINT AS all_trip_count
          FROM grouped
          WHERE source IN ('yellow', 'green', 'hvfhv')
          GROUP BY month, day_type, borough, zone_id
        )
        SELECT
          g.source, g.month, g.day_type, g.borough, g.zone_id, g.trip_count,
          CASE WHEN t.all_trip_count > 0 THEN g.trip_count::DOUBLE / t.all_trip_count ELSE NULL END AS trip_share,
          g.avg_fare, g.avg_distance, g.avg_duration_minutes
        FROM grouped g
        JOIN totals t USING (month, day_type, borough, zone_id)
        WHERE g.source IN ('yellow', 'green', 'hvfhv')
        ORDER BY g.source, g.month, g.day_type
        """,
    )
    write_json(output_dir / "source_comparison.json", comparison_rows)
    counts["source_comparison.json"] = len(comparison_rows)

    distribution_rows = fetch_rows(
        con,
        """
        WITH grouped AS (
          SELECT mode, source, month, day_type, borough, zone_id, bucket_start, bucket_end, sum(trip_count)::BIGINT AS trip_count
          FROM distribution_source
          GROUP BY mode, source, month, day_type, borough, zone_id, bucket_start, bucket_end
          UNION ALL
          SELECT mode, 'all' AS source, month, day_type, borough, zone_id, bucket_start, bucket_end, sum(trip_count)::BIGINT AS trip_count
          FROM distribution_source
          GROUP BY mode, month, day_type, borough, zone_id, bucket_start, bucket_end
        ),
        totals AS (
          SELECT mode, source, month, day_type, borough, zone_id, sum(trip_count)::BIGINT AS total_count
          FROM grouped
          GROUP BY mode, source, month, day_type, borough, zone_id
        )
        SELECT
          g.*,
          CASE
            WHEN mode = 'fare' AND bucket_end IS NULL THEN '$100+'
            WHEN mode = 'fare' THEN '$' || bucket_start::INTEGER::VARCHAR || '-$' || bucket_end::INTEGER::VARCHAR
            WHEN mode = 'distance' AND bucket_end IS NULL THEN '20+ mi'
            ELSE bucket_start::INTEGER::VARCHAR || '-' || bucket_end::INTEGER::VARCHAR || ' mi'
          END AS bucket_label,
          CASE WHEN t.total_count > 0 THEN g.trip_count::DOUBLE / t.total_count ELSE NULL END AS density
        FROM grouped g
        JOIN totals t USING (mode, source, month, day_type, borough, zone_id)
        ORDER BY mode, source, month, day_type, bucket_start
        """,
    )
    write_json(output_dir / "fare_distance_distribution.json", distribution_rows)
    counts["fare_distance_distribution.json"] = len(distribution_rows)

    write_json(processed_dir / "frontend_json_counts.json", {"generated_at": datetime.now(timezone.utc).isoformat(), "counts": counts})
    return counts


def export_all(args: argparse.Namespace) -> dict[str, int]:
    duckdb = import_duckdb()
    raw_dir = args.raw_dir.resolve()
    processed_dir = args.processed_dir.resolve()
    output_dir = args.output_dir.resolve()
    processed_dir.mkdir(parents=True, exist_ok=True)
    output_dir.mkdir(parents=True, exist_ok=True)

    zones = load_zone_lookup(args.geojson_path.resolve())
    tasks = discover_files(raw_dir, args.max_files)
    if not tasks:
        raise SystemExit(f"No parquet files found under {raw_dir}")

    db_path = processed_dir / "nyc_mobility.duckdb"
    if db_path.exists():
        db_path.unlink()
    tmp_path = processed_dir / "nyc_mobility.duckdb.tmp"
    if tmp_path.exists():
        if tmp_path.is_dir():
            import shutil

            shutil.rmtree(tmp_path)
        else:
            tmp_path.unlink()

    con = duckdb.connect(str(db_path))
    con.execute(f"PRAGMA threads={args.threads}")
    con.execute(f"PRAGMA memory_limit='{args.memory_limit}'")
    create_zone_table(con, zones)
    reset_tables(con)

    for index, (source, month, path) in enumerate(tasks, start=1):
        print(f"[{index}/{len(tasks)}] processing {source} {month}: {path.name}", flush=True)
        create_current_tables(con, source, month, path)
        process_current_file(con)

    print("Exporting frontend JSON files", flush=True)
    counts = export_tables(con, output_dir, processed_dir, raw_dir, zones, args.od_top_n)
    con.close()
    return counts


def ensure_processed_dir(processed_dir: Path = DEFAULT_PROCESSED_DIR) -> Path:
    processed_dir.mkdir(parents=True, exist_ok=True)
    return processed_dir


def main() -> None:
    parser = argparse.ArgumentParser(description="Preprocess NYC TLC parquet data into frontend JSON.")
    parser.add_argument("--raw-dir", type=Path, default=DEFAULT_RAW_DIR)
    parser.add_argument("--processed-dir", type=Path, default=DEFAULT_PROCESSED_DIR)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--geojson-path", type=Path, default=DEFAULT_GEOJSON_PATH)
    parser.add_argument("--threads", type=int, default=4)
    parser.add_argument("--memory-limit", default="8GB")
    parser.add_argument("--od-top-n", type=int, default=300)
    parser.add_argument("--max-files", type=int, default=None, help="debug option: process only the first N parquet files")
    args = parser.parse_args()

    counts = export_all(args)
    print("Generated frontend JSON row counts:", flush=True)
    for name, count in counts.items():
        print(f"  {name}: {count}", flush=True)


if __name__ == "__main__":
    main()
