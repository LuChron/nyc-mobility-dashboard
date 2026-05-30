"""Fetch official NYC Taxi Zone GeoJSON for the frontend map."""

from __future__ import annotations

import json
import urllib.request
from pathlib import Path
from typing import Any


TAXI_ZONES_GEOJSON_URL = "https://data.cityofnewyork.us/resource/8meu-9t5y.geojson?$limit=3000"


def fetch_taxi_zones(output_path: Path = Path("frontend/public/data/taxi_zones.geojson")) -> None:
    with urllib.request.urlopen(TAXI_ZONES_GEOJSON_URL, timeout=60) as response:
        geojson: dict[str, Any] = json.load(response)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(geojson, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"saved {len(geojson.get('features', []))} taxi zones to {output_path}")


def main() -> None:
    fetch_taxi_zones()


if __name__ == "__main__":
    main()

