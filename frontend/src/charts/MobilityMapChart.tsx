import { useCallback, useEffect, useMemo, useState } from 'react';
import * as echarts from 'echarts';
import type { ECElementEvent, EChartsOption } from 'echarts';
import type { MapRoute } from '../types/dashboard';
import { EChart } from './EChart';
import { colors } from './chartTheme';

interface MapZoneDatum {
  locationId: string;
  name: string;
  value: number;
  borough: string;
  selected: boolean;
}

interface MobilityMapChartProps {
  zones: MapZoneDatum[];
  routes: MapRoute[];
  selectedZone: string;
  selectableZoneIds: string[];
  metricLabel: string;
  metricUnit: string;
  odRouteStatus: 'loading' | 'ready' | 'error';
  onZoneSelect: (zoneId: string) => void;
  onClearZone: () => void;
}

type TaxiZoneProperties = {
  locationid?: string;
  zone?: string;
  borough?: string;
  name?: string;
};

type TaxiZoneFeature = {
  type: string;
  properties: TaxiZoneProperties;
  geometry: unknown;
};

type TaxiZoneGeoJson = {
  type: 'FeatureCollection';
  features: TaxiZoneFeature[];
};

const MAP_NAME = 'nycTaxiZones';

function formatMapValue(value: number, unit: string) {
  if (unit === 'USD') return `$${value.toFixed(2)}`;
  if (unit === 'mi') return `${value.toFixed(2)} mi`;
  return `${Math.round(value).toLocaleString()} ${unit}`;
}

export function MobilityMapChart({ zones, routes, selectedZone, selectableZoneIds, metricLabel, metricUnit, odRouteStatus, onZoneSelect, onClearZone }: MobilityMapChartProps) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [zoneLookup, setZoneLookup] = useState<Record<string, { zone: string; borough: string }>>({});
  const [featureCount, setFeatureCount] = useState(0);
  const [mapZoom, setMapZoom] = useState(1.12);
  const [mapNotice, setMapNotice] = useState('');

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/taxi_zones.geojson`)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json() as Promise<TaxiZoneGeoJson>;
      })
      .then((geoJson) => {
        if (cancelled) return;
        const lookup: Record<string, { zone: string; borough: string }> = {};
        geoJson.features.forEach((feature) => {
          const id = feature.properties.locationid ?? '';
          lookup[id] = {
            zone: feature.properties.zone ?? id,
            borough: feature.properties.borough ?? 'Unknown',
          };
        });
        echarts.registerMap(MAP_NAME, geoJson as never);
        setZoneLookup(lookup);
        setFeatureCount(geoJson.features.length);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setMapNotice('');
  }, [selectedZone, selectableZoneIds]);

  const zoneValues = useMemo(() => {
    const values = new Map(zones.map((zone) => [zone.locationId, zone]));
    return values;
  }, [zones]);

  const selectableZones = useMemo(() => new Set(selectableZoneIds), [selectableZoneIds]);

  const option = useMemo(() => {
    if (!ready) {
      return {} as EChartsOption;
    }

    const maxValue = Math.max(...zones.map((zone) => zone.value), 1);
    const routeLines = selectedZone === 'all' ? [] : [...routes]
      .sort((a, b) => b.value - a.value)
      .slice(0, 4)
      .map((route) => ({
          coords: [route.fromCoord, route.toCoord],
          value: route.value,
          lineStyle: {
            color: route.color,
            width: Math.max(1.4, Math.min(3.4, route.value / 3600)),
            opacity: 0.62,
          },
        }));

    return {
      tooltip: {
        trigger: 'item',
        backgroundColor: '#061321',
        borderColor: '#1d5b92',
        textStyle: { color: colors.text },
        formatter: (params: unknown) => {
          const typed = params as { name?: string; data?: { locationId?: string; value?: number; name?: string; borough?: string } };
          const id = typed.data?.locationId ?? typed.name ?? '';
          const lookup = zoneLookup[id];
          const metric = zoneValues.get(id);
          const value = typed.data?.value ?? metric?.value;
          const zoneName = lookup?.zone ?? id;
          const borough = lookup?.borough ?? typed.data?.borough ?? '-';
          if (metric) {
            return `${zoneName}<br/>Borough: ${borough}<br/>${metricLabel}: ${formatMapValue(value ?? 0, metricUnit)}`;
          }
          return `${zoneName}<br/>Borough: ${borough}<br/>No mock data in this prototype`;
        },
      },
      visualMap: {
        show: false,
        min: 0,
        max: maxValue,
        right: 12,
        bottom: 14,
        itemWidth: 140,
        itemHeight: 10,
        orient: 'horizontal',
        text: ['High', 'Low'],
        textStyle: { color: colors.muted, fontSize: 10 },
        inRange: { color: ['#10242c', '#1e5a62', '#3e8877', '#d56734', '#f6c84c'] },
        calculable: false,
      },
      geo: {
        map: MAP_NAME,
        roam: true,
        zoom: mapZoom,
        center: [-73.945, 40.72],
        nameProperty: 'locationid',
        itemStyle: {
          areaColor: '#10242c',
          borderColor: 'rgba(115, 196, 255, 0.38)',
          borderWidth: 0.55,
        },
        emphasis: {
          itemStyle: {
            areaColor: '#d56734',
            borderColor: '#dff1ff',
            borderWidth: 1,
          },
          label: { show: false },
        },
      },
      series: [
        {
          name: 'Taxi Zone Metric',
          type: 'map',
          geoIndex: 0,
          nameProperty: 'locationid',
          data: Object.keys(zoneLookup).map((id) => {
            const zone = zoneValues.get(id);
            const isSelected = selectedZone === id;
            return {
              name: id,
              locationId: id,
              value: zone?.value ?? 0,
              borough: zone?.borough ?? zoneLookup[id]?.borough ?? '',
              itemStyle: isSelected
                ? {
                    areaColor: '#f6c84c',
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    shadowBlur: 14,
                    shadowColor: 'rgba(246, 200, 76, 0.52)',
                  }
                : undefined,
            };
          }),
        },
        {
          name: 'OD Flow',
          type: 'lines',
          coordinateSystem: 'geo',
          zlevel: 4,
          effect: { show: selectedZone !== 'all', symbol: 'arrow', symbolSize: 6, trailLength: 0.08 },
          lineStyle: { curveness: 0.16 },
          data: routeLines,
        },
      ],
    } as EChartsOption;
  }, [mapZoom, metricLabel, metricUnit, ready, routes, selectedZone, zoneLookup, zoneValues, zones]);

  const handleClick = useCallback((event: ECElementEvent) => {
    const data = event.data as { locationId?: string } | undefined;
    const zoneId = data?.locationId ?? (typeof event.name === 'string' ? event.name : '');
    if (zoneId && zoneLookup[zoneId] && selectableZones.has(zoneId)) {
      setMapNotice('');
      onZoneSelect(zoneId);
      return;
    }

    if (zoneId && zoneLookup[zoneId]) {
      const zoneName = zoneLookup[zoneId]?.zone ?? zoneId;
      setMapNotice(`${zoneName} is outside the current filter/model. Change borough or choose All Boroughs to inspect it.`);
    }
  }, [zoneLookup, selectableZones, onZoneSelect]);

  const selectedZoneName = selectedZone === 'all' ? 'No zone selected' : zoneLookup[selectedZone]?.zone ?? selectedZone;
  const routeCount = selectedZone === 'all' ? 0 : Math.min(routes.length, 4);
  const routeStatusText = selectedZone === 'all'
    ? `${featureCount} mapped zones / ${zones.length} modeled zones`
    : odRouteStatus === 'loading'
      ? 'Loading OD route records'
      : routeCount > 0
        ? `${routeCount} top OD route${routeCount === 1 ? '' : 's'} shown`
        : 'No top OD route records for this zone';
  const routeHelpText = selectedZone === 'all'
    ? 'Hover is temporary; click a modeled zone to lock it.'
    : odRouteStatus === 'loading'
      ? 'The zone is locked. Routes will appear if the OD file has matches.'
      : routeCount > 0
        ? 'Yellow fill is selected. Lines show top OD flows; clear to unlock.'
        : 'The zone is selected, but this filter has no exported top OD line.';

  return (
    <div className="map-stage real-map-stage">
      {!ready && !loadError && <div className="map-loading">Loading NYC taxi zones...</div>}
      {loadError && <div className="map-loading">Failed to load map data</div>}
      <EChart option={option} className="chart map-chart" onClick={handleClick} />
      <div className="map-tools">
        <button type="button" aria-label="Zoom in" onClick={() => setMapZoom((zoom) => Math.min(2.2, Number((zoom + 0.14).toFixed(2))))}>+</button>
        <button type="button" aria-label="Zoom out" onClick={() => setMapZoom((zoom) => Math.max(0.82, Number((zoom - 0.14).toFixed(2))))}>-</button>
        <button type="button" aria-label="Reset map" onClick={() => {
          setMapZoom((zoom) => (zoom === 1.12 ? 1.1201 : 1.12));
        }}>◎</button>
      </div>
      <div className="map-status">
        <span>{selectedZone === 'all' ? 'Explore mode' : `Locked: ${selectedZoneName}`}</span>
        <strong>{routeStatusText}</strong>
        <em>{routeHelpText}</em>
        {mapNotice && <p className="map-notice">{mapNotice}</p>}
        {selectedZone !== 'all' && (
          <button type="button" className="map-clear-zone" onClick={onClearZone}>
            Clear zone
          </button>
        )}
      </div>
      <div className="map-interaction-key" aria-label="Map interaction legend">
        <span><i className="key-hover" /> Hover preview</span>
        <span><i className="key-selected" /> Click selection</span>
        <span><i className="key-line" /> OD route after selection</span>
      </div>
      <div className="map-legend">
        <span>{metricLabel}</span>
        <div className="legend-ramp" />
        <div className="legend-scale">
          <span>Low</span>
          <span>High</span>
        </div>
      </div>
    </div>
  );
}
